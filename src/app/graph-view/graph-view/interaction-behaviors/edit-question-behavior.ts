import {NodeInteractionBehavior} from './node-interaction-behavior';
import {GraphNode} from '../graph-data-model/graph-node';
import {GraphViewService} from '../graph-view.service';
import {InspectDialogComponent} from '../../inspect-dialog/inspect-dialog.component';
import {AgentService} from '../../../shared/agent/agent.service';
import {VoteUtil} from '../utils/vote-util';
import { MatDialog } from '@angular/material/dialog';

export class EditQuestionBehavior extends NodeInteractionBehavior {

  constructor(private graphViewService: GraphViewService, private agentService: AgentService,
              private dialog: MatDialog) {
    super();
  }

  async interactWith(node: GraphNode): Promise<any> {
    const agent = await this.agentService.getAgent();
    const authorName = await this.agentService.getAgentName(node.question.authorId);
    const questionVotes = node.questionVotes;
    const votes = VoteUtil.countVotes(questionVotes);

    const isAuthor = agent.agentid === node.question.authorId;
    const myVote = questionVotes.find(vote => agent.agentid === vote.voterAgentId);

    const data = {
      isAuthor: isAuthor,
      text: node.question.text,
      authorName: authorName,
      lastModified: new Date(node.question.timestampLastModified).toLocaleString(),
      inputHeading: `${authorName} (${node.question.timestampLastModified})`,
      votes: votes,
      vote: myVote ? myVote.value : null
    };

    const dialogRef = this.dialog.open(InspectDialogComponent, {data: data});
    const result = await dialogRef.afterClosed().toPromise();
    if (result !== undefined) {
      if (isAuthor) {
        await this.graphViewService.updateQuestion(node.id, data.text);
      } else if (data.vote !== undefined) {
        await this.graphViewService.updateQuestionVote(node.id, agent.agentid, data.vote);
      }
    }
  }
}
