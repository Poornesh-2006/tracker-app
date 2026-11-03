import { Redirect, type Href } from 'expo-router';

/**
 * Google OAuth returns to lifos://auth-callback. openAuthSessionAsync normally
 * swallows it, but Android can also deliver it as a deep link; without this
 * route expo-router shows "Unmatched route". The code exchange happens in
 * signInWithGoogle, so just bounce home.
 */
export default function AuthCallback() {
  return <Redirect href={'/' as Href} />;
}
