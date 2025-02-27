import {Injectable} from '@angular/core';
import {RestHelperService} from '../rest-helper/rest-helper.service';
import {SpaceSubscription} from '../rest-data-model/spacesubscription';
import { catchError, shareReplay } from 'rxjs/operators';
import { EMPTY, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable()
export class AgentService {

  private cachedAgent: {agentid: string};
  private cache: Observable<any>
  private cachedAgentNames: Map<string, string> = new Map<string, string>();

  constructor(private restHelperService: RestHelperService) {
  }

  public getAgent(): Promise<any> {
    if (this.cache) {
      return this.cache.toPromise();
    } else {
      this.cache = this.restHelperService.getCurrentAgentLocal().pipe(
        shareReplay(1),
        catchError(err => {
          delete this.cache;
          return EMPTY;
        })
      )
      return this.cache.toPromise();
    }
  }

  public putAgentName(agentId: string, name: string): Promise<string> {
    this.cachedAgentNames.set(agentId, name);
    return this.restHelperService.put(`/agents/${agentId}`, {agentName: name})
      .then((res) => res.name as string);
  }

  public getAgentName(agentId: string): Promise<string> {
    if (this.cachedAgentNames.has(agentId)) {
      return Promise.resolve(this.cachedAgentNames.get(agentId));
    } else {
      return this.restHelperService.get(`/agents/${agentId}`).then(res => {
        this.cachedAgentNames.set(agentId, res.name);
        return res.name as string;
      }, reason => 'unknown');
    }
  }

  public getSpaceSubscriptions(): Promise<SpaceSubscription[]> {
    return this.getAgent()
      .then((agent) => {
          return this.restHelperService.get(`/agents/${agent.agentid}/spacesubscriptions`)
            .then((res2: SpaceSubscription[]) => {
              return res2;
            });
      }).catch(() => {
        return Promise.reject(null)
      });
  }

  public postSpaceSubscription(postData: { spaceId: string, spaceSecret: string }): Promise<SpaceSubscription> {
    return this.getAgent()
      .then((agent) => {
        return this.restHelperService.post(`/agents/${agent.agentid}/spacesubscriptions`, postData)
          .then(res => {
            // TODO: Hacky hack, needs to be fixed by the backend!
            let location: string = res.headers.get('location');
            if (environment.production) {
              location = location.replace("http", "https");
            }
            return this.restHelperService.getAbsoulte(location)
              .then((res2: SpaceSubscription) => res2);
          });
      });
  }

  public putSelectionOfSubscription(spaceId: string, selection: string[]): Promise<any> {
    return this.getAgent().then((agent) => {
      return this.restHelperService
        .put(`/agents/${agent.agentid}/spacesubscriptions/${spaceId}/selectedQuestions`,
          {selectedQuestions: selection})
        .then((res) => {
          return res;
        });
    });
  }
}
