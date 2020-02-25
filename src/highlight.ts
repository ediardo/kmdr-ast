import { ASTNode } from ".";
import ASTNodePoint from "./astNodePoint";
import { Decorators, NodeDefinition } from "./interfaces";
import Tree from "./tree";

export default class Highlight<R> {
  private static findNodeDefinition(
    node: ASTNode,
    definitions: NodeDefinition[]
  ) {
    const matches = definitions.filter(definition => {
      const definitionRange = [
        definition.startPosition,
        definition.endPosition
      ];
      const nodeRange = [node.startPosition, node.endPosition];

      return (
        ASTNodePoint.areEqualRanges(nodeRange, definitionRange) ||
        ASTNodePoint.rangeContainsRange(nodeRange, definitionRange)
      );
    });

    return matches;
  }

  private mode: string;
  private decorators: Decorators<R>;

  constructor(decorators: Decorators<R>, mode: string) {
    this.decorators = decorators;
    this.mode = mode;
  }

  public source(
    source: string,
    tree: Tree,
    definitions: NodeDefinition[]
  ): R[] {
    const nodes = tree.flatten();

    let currentToken = 0;
    let inRange = false;
    let wordInRange = "";
    let row = 0;

    const decoratedStrings: R[] = [];
    let columnAtLine = 0;

    for (let column = 0; column < source.length; column++) {
      const char = source[column];

      if (char === `\n`) {
        decoratedStrings.push(this.decorators.newLine());
        wordInRange = "";

        if (nodes[currentToken].type === "\n") {
          currentToken += 1;
        }
        inRange = false;
        row++;
        columnAtLine = 0;
        continue;
      }

      const { startPosition, endPosition } = nodes[currentToken];
      const point = new ASTNodePoint({ row, column: columnAtLine });

      if (
        currentToken < nodes.length &&
        ASTNodePoint.isInRange([startPosition, endPosition], point)
      ) {
        inRange = true;
        wordInRange += char;
        // if there's a token that spans till the end of the string
        if (
          column === source.length - 1 ||
          columnAtLine === nodes[currentToken].endPosition.column - 1
        ) {
          decoratedStrings.push(
            ...this.decorateNode(wordInRange, nodes[currentToken], definitions)
          );
          wordInRange = "";
          currentToken += 1;
          inRange = false;
        }
      } else {
        if (inRange) {
          decoratedStrings.push(
            ...this.decorateNode(wordInRange, nodes[currentToken], definitions)
          );
          wordInRange = "";
          currentToken += 1;
          inRange = false;
        }
        // if the current char is not part of any token, then append it to the array
        decoratedStrings.push(this.decorators.word(char));
      }
      columnAtLine++;
    }

    return decoratedStrings;
  }

  private decorateNode(
    text: string,
    node: ASTNode,
    definitions: NodeDefinition[]
  ): R[] {
    const decoratedStrings = [];
    const { startPosition } = node;
    let currentToken = 0;
    let inRange = false;
    let wordInRange = "";

    const matches = Highlight.findNodeDefinition(node, definitions);

    if (matches.length === 0) {
      decoratedStrings.push(this.decorateText(text, node.type));
    } else {
      for (let column = 0; column < text.length; column++) {
        // get the current character
        const char = text[column];
        // calculate the column position relative to the startPosition
        // of the node
        const columnInNode = startPosition.column + column;

        // new points to check if character is within a range of
        // a node definition
        const point = new ASTNodePoint({
          column: columnInNode,
          row: startPosition.row
        });

        if (
          currentToken < matches.length &&
          ASTNodePoint.isInRange(
            [
              matches[currentToken].startPosition,
              matches[currentToken].endPosition
            ],
            point
          )
        ) {
          inRange = true;
          wordInRange += char;
          // if there's a token that spans till the end of the string
          if (
            column === text.length - 1 ||
            columnInNode === matches[currentToken].endPosition.column - 1
          ) {
            decoratedStrings.push(
              this.decorateText(
                wordInRange,
                matches[currentToken].type,
                matches[currentToken]
              )
            );
            wordInRange = "";
            currentToken += 1;
            inRange = false;
          }
        } else {
          if (inRange) {
            decoratedStrings.push(
              this.decorateText(
                wordInRange,
                matches[currentToken].type,
                matches[currentToken]
              )
            );
            wordInRange = "";
            currentToken += 1;
            inRange = false;
          }
          // if the current char is not part of any token, then append it to the string
          // decoratedStrings.push(char);
          decoratedStrings.push(this.decorateText(char, node.type));
        }
      }
    }

    return decoratedStrings;
  }

  private decorateText(
    text: string,
    type: string,
    definition?: NodeDefinition
  ): R {
    switch (type) {
      case "`":
        return this.decorators.backtick(text);
      case "|":
        return this.decorators.pipeline(text, definition);
      case "&&":
        return this.decorators.operator(text, definition);
      case "(":
      case "$(":
      case ")":
        return this.decorators.parens(text);
      case "{":
      case "}":
        return this.decorators.braces(text);
      case ">":
      case ">&":
        return this.decorators.redirect(text, definition);
      case ";":
        return this.decorators.semicolon(text, definition);
      case "=":
        return this.decorators.equal(text, definition);
      case "command_name":
      case "program":
        return this.decorators.program(text, definition);
      case "comment":
        return this.decorators.comment(text, definition);
      case "do":
        return this.decorators.do(text, definition);
      case "done":
        return this.decorators.done(text, definition);
      case "file_descriptor":
        return this.decorators.fileDescriptor(text, definition);
      case "for":
        return this.decorators.for(text, definition);
      case "function":
        return this.decorators.fn(text, definition);
      case "in":
        return this.decorators.in(text, definition);
      case "option":
        return this.decorators.option(text, definition);
      case "optionArg":
        return this.decorators.optionArg(text, definition);
      case "subcommand":
        return this.decorators.subcommand(text, definition);
      case "variable_name":
        return this.decorators.variableName(text, definition);
      case "while":
        return this.decorators.while(text, definition);
      default:
        return this.decorators.word(text, definition);
    }
  }
}
