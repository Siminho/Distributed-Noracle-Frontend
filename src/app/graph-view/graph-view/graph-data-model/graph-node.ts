import { SimulationNodeDatum } from 'd3-force';
import { Relation } from '../../../shared/rest-data-model/relation';
import { Question } from '../../../shared/rest-data-model/question';
import { QuestionVote } from '../../../shared/rest-data-model/question-vote';
import { RelationVote } from '../../../shared/rest-data-model/relation-vote';
import { DrawUtil } from '../utils/draw-util';

export class GraphNode implements SimulationNodeDatum {
  private lines: string[];
  private textSize = 10;
  private bubbleScaleFactor = 1.25;
  public radius: number;
  public relationVotes: Map<string, RelationVote[]> = new Map<string, RelationVote[]>();
  public relations: Relation[];

  /**
   * Node’s current x-position
   */
  x?: number;
  /**
   * Node’s current y-position
   */
  y?: number;


  constructor(context: CanvasRenderingContext2D, public id: string,
              public question: Question, public questionAuthor: string, public questionVotes: QuestionVote[],
              relations: Relation[], public relationAuthors: string[], relationVotes: RelationVote[][],
              public isSelected = false, public isSeed = false) {
    this.relations = relations.slice(0);
    this.lines = this.wrapText((s) => context.measureText(s).width);
    for (let i = 0; i < relations.length; i++) {
      this.relationVotes.set(relations[i].relationId, relationVotes[i] !== undefined ? relationVotes[i] : []);
    }
  }

  public setLabel(label: string, context: CanvasRenderingContext2D) {
    this.question.text = label;
    this.lines = this.wrapText((s) => context.measureText(s).width);
  }

  draw(context: CanvasRenderingContext2D) {

    // draw the bubbles
    const borderColor = DrawUtil.getColorCodeForValueInScale(this.questionVotes.map(v => v.value).reduce((p, c) => p + c, 0),
      -this.questionVotes.length, this.questionVotes.length);


    // OPTION A
    for (let i = 1; i < this.question.followUps + 1; i++) {
      const alpha = 1 - 0.2 * i;
      this.drawBubble(context, this.x + i * 4, this.y + i * 4, this.radius, 1, 'rgba(0, 0, 0, ' + alpha + ')');
    }

    // OPTION B
    /*
    for (let i = 0; i < this.followUps; i++) {
      const angle = (i * 2 * Math.PI) / this.followUps;
      const radius = 15;
      this.drawBubble(context,
        this.x + Math.sin(angle) * (this.radius - radius / 3),
        this.y + Math.cos(angle) * (this.radius - radius / 3),
        radius, 1, 'rgba(0, 0, 0, 0.5)');
    }*/

    // draw center bubble with fill
    this.drawBubble(context, this.x, this.y, this.radius, this.isSelected ? 3 : 1, borderColor);
    context.fillStyle = '#fff';
    context.fill();

    // draw the text
    context.beginPath();
    context.fillStyle = '#000';
    context.font = (this.isSeed ? 'italic ' : '') + this.textSize + 'px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';

    for (let i = 0; i < this.lines.length; i++) {
      const yOffset = -(this.getTextHeigth() * this.lines.length) / 2 + (i * this.getTextHeigth());
      context.fillText(this.lines[i], this.x, this.y + yOffset);
    }
  }

  drawBubble(context: CanvasRenderingContext2D, x: number, y: number, radius: number,
    lineWidth: number = 1, strokeStyle: string = '#000000') {
    const alpha = Math.PI / 8;
    const beta = Math.PI / 16;
    context.beginPath();
    context.moveTo(x + radius / this.bubbleScaleFactor, y);
    context.arc(x, y, radius / this.bubbleScaleFactor, 0, alpha);
    context.lineTo(x + Math.cos(alpha + beta / 2) * radius, y + Math.sin(alpha + beta / 2) * radius);
    context.arc(x, y, radius / this.bubbleScaleFactor, alpha + beta, 2 * Math.PI);
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }

  getTextHeigth() {
    return this.textSize * 1.5;
  }

  wrapText(measure: (string) => number) {
    const textHeight = this.getTextHeigth();
    const totalWidth = measure(this.question.text);
    const words = [this.questionAuthor + ':'].concat(this.question.text.split(/\s+/));
    const longestWordLength =
      Math.ceil(measure(words.reduce((prev, cur, i) => measure(prev) > measure(cur) ? prev : cur)));
    const blankWidth = measure(' ');
    let fit = false;
    let radius = Math.floor(Math.sqrt(totalWidth * textHeight / 3));
    radius = radius > longestWordLength / 2 ? radius : longestWordLength / 2;
    while (!fit) {
      const numberOfLines = Math.floor(2 * radius / textHeight);
      const lines = [''];
      let remainingLineLength =
        2 * Math.sqrt(Math.pow(radius, 2) - Math.pow(textHeight * numberOfLines / 2, 2));
      fit = true;
      for (const word of words) {
        const wordWith = measure(word);
        while (remainingLineLength < wordWith) {
          // skip lines that are too short for the word
          lines[lines.length - 1] = lines[lines.length - 1].trim();
          lines.push('');
          remainingLineLength =
            2 * Math.sqrt(Math.pow(radius, 2) - Math.pow(textHeight * Math.abs(numberOfLines / 2 - (lines.length - 1)), 2));
          if (lines.length > numberOfLines) {
            // word was too long for all remaining lines
            fit = false;
            break;
          }
        }
        lines[lines.length - 1] += word + ' ';
        remainingLineLength -= (wordWith + blankWidth);
      }
      if (!fit) {
        radius++;
      } else {
        while (lines.length - 1 < numberOfLines) {
          lines.push('');
        }
        this.radius = (radius + textHeight * 0.5) * this.bubbleScaleFactor;
        return lines;
      }
    }
  }

  update(n: GraphNode): boolean {
    if (this.isEqual(n)) {
      return false;
    }
    this.question = n.question;
    this.relations = n.relations.splice(0);
    this.lines = n.lines;
    this.radius = n.radius;
    this.textSize = n.textSize;
    this.bubbleScaleFactor = n.bubbleScaleFactor;
    this.questionVotes = n.questionVotes;
    this.relationVotes = n.relationVotes;
    this.relationAuthors = n.relationAuthors;
    return true;
  }

  private isEqual(n: GraphNode): boolean {
    return this.question && n.question &&
      this.question.questionId === n.question.questionId &&
      this.question.timestampLastModified === n.question.timestampLastModified &&
      this.relations.length === n.relations.length &&
      JSON.stringify(this.relations) === JSON.stringify(n.relations) &&
      this.lines.map((l, i) => l === n.lines[i]).reduce((prev, cur) => prev && cur, true) &&
      this.radius === n.radius &&
      this.textSize === n.textSize &&
      this.bubbleScaleFactor === n.bubbleScaleFactor &&
      this.questionVotes.length === n.questionVotes.length &&
      this.questionVotes.map((v, i) => v.value === n.questionVotes[i].value).reduce((p, c) => p && c, true) &&
      this.relationVotes.size === n.relationVotes.size &&
      this.relations.map(r =>
        this.relationVotes.get(r.relationId).length === n.relationVotes.get(r.relationId).length &&
        this.relationVotes.get(r.relationId).map((v, i) => v.value === n.relationVotes.get(r.relationId)[i].value &&
        v.voterAgentId === n.relationVotes.get(r.relationId)[i].voterAgentId).reduce((p, c) => p && c, true)
      ).reduce((p, c) => p && c, true);
  }
}
