import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakLoginOptions } from 'keycloak-js';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AgentService } from '../agent/agent.service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  public isAuthorized = false;
  private userName: string;

  private keycloakLoginOptions: KeycloakLoginOptions = {
    redirectUri: environment.redirectUrl
  }

  constructor(private router: Router, protected readonly keycloak: KeycloakService, private agentService: AgentService) {
    this.keycloak.isLoggedIn().then((loggedIn: boolean) => {
      this.isAuthorized = loggedIn;
      if (loggedIn) {
        this.userName = this.keycloak.getUsername();
        this.agentService.getAgent();
      }
    });
  }

  async login() {
    await this.keycloak.login(this.keycloakLoginOptions);
    this.isAuthorized = await this.keycloak.isLoggedIn();
    if (this.isAuthorized) {

    }
  }

  getUserName(): string {
    return this.userName;
  }

  getLastRouteRequested() {
    const cookieValue = document.cookie.replace(/(?:(?:^|.*;\s*)rejectedPath\s*\=\s*([^;]*).*$)|^.*$/, '$1');
    document.cookie = 'rejectedPath=; expires=' + new Date(0).toUTCString();
    return cookieValue !== undefined && cookieValue.length > 0 ? JSON.parse(decodeURIComponent(cookieValue)) : undefined;
  }

  checkAuthorized(route: ActivatedRouteSnapshot): boolean | Observable<boolean> | Promise<boolean> {
    return this.keycloak.isLoggedIn().then((loggedIn: boolean) => {
      if (loggedIn) {
        this.isAuthorized = true;
        return this.isAuthorized;
      } else {
        document.cookie = 'rejectedPath=' + encodeURIComponent(JSON.stringify({
          url: route.url.map((v) => v.path).reduce((prev, cur) => prev + '/' + cur, ''),
          queryParams: route.queryParams
        })) + '; path=/; expires=' + new Date(Date.now() + ((3 * 60 * 1000))).toUTCString();

        this.router.navigate(['/login'], {replaceUrl: true});
        this.isAuthorized = false;
        return this.isAuthorized;
      }
    });
  }

  logoff(): void {
    this.isAuthorized = false;
  }
}
