import {
  signIn,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  updatePassword,
  updateUserAttributes,
  getCurrentUser,
  fetchUserAttributes,
  signOut,
  fetchAuthSession,
} from 'aws-amplify/auth';

import { RegisterData, UserProfile } from '../types';

export const authService = {
  async signIn(email: string, password: string) {
    return signIn({ username: email, password });
  },

  async signUp(data: RegisterData) {
    return signUp({
      username: data.email,
      password: data.password,
      options: {
        userAttributes: {
          email: data.email,
          name: data.name,
          preferred_username: data.preferredUsername,
        },
      },
    });
  },

  async confirmSignUp(email: string, code: string) {
    return confirmSignUp({ username: email, confirmationCode: code });
  },

  async resendSignUpCode(email: string) {
    return resendSignUpCode({ username: email });
  },

  async resetPassword(email: string) {
    return resetPassword({ username: email });
  },

  async confirmResetPassword(email: string, code: string, newPassword: string) {
    return confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword,
    });
  },

  async changePassword(oldPassword: string, newPassword: string) {
    return updatePassword({ oldPassword, newPassword });
  },

  async updateUserAttributes(attributes: Record<string, string>) {
    const userAttributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(attributes)) {
      userAttributes[key] = value;
    }
    return updateUserAttributes({ userAttributes });
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      return {
        userId: user.userId,
        email: attributes.email || '',
        name: attributes.name || '',
        preferredUsername: attributes.preferred_username || '',
        emailVerified: attributes.email_verified === 'true',
      };
    } catch {
      return null;
    }
  },

  async signOut() {
    return signOut();
  },

  async getIdToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch {
      return null;
    }
  },
};
