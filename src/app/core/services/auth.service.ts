import { Injectable, inject } from '@angular/core';
import { Auth, authState, signInWithPopup, signOut, GoogleAuthProvider, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  readonly authState$: Observable<User | null> = authState(this.auth);

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  signInWithGoogle(): Promise<void> {
    return signInWithPopup(this.auth, new GoogleAuthProvider()).then(() => void 0);
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}
