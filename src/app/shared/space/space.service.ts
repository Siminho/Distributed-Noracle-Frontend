import {Injectable} from '@angular/core';
import {RestHelperService} from '../rest-helper/rest-helper.service';
import {Space} from '../rest-data-model/space';
import {SpaceSubscriber} from '../rest-data-model/spacesubscriber';
import { environment } from 'src/environments/environment';

@Injectable()
export class SpaceService {

  constructor(private restHelperService: RestHelperService) {
  }

  public getSpace(id): Promise<Space> {
    return this.restHelperService.get(`/spaces/${id}`).then((res: Space) => { return res; });
  }

  public postSpace(space: Space): Promise<Space> {
    return this.restHelperService.post('/spaces', space)
      .then((res) => {
        // TODO: Hacky hack, needs to be fixed by the backend!
        let location: string = res.headers.get('location');
        if (environment.production) {
          location = location.replace("http", "https");
        }
        return this.restHelperService.getAbsoulte(location)
          .then((r: Space) => {
            return r;
          });
      }).catch((err) => {
        return null;
      })
  }

  public getSpaceSubscribers(spaceId: string): Promise<SpaceSubscriber[]> {
    return this.restHelperService.get(`/spaces/${spaceId}/subscribers`);
  }

  public getPublicSpaces(): Promise<Space[]> {
    return this.restHelperService.get(`/spaces/public`);
  }

  public getSpaceVoteCount(spaceId: string): Promise<number> {
    return this.restHelperService.get(`/spaces/${spaceId}/votecount`);
  }

}
