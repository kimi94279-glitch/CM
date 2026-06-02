import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './types';

// 초대 딥링크: couplemap://invite?token=...  → InviteJoin (token 파라미터)
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'couplemap://'],
  config: {
    screens: {
      InviteJoin: 'invite',
    },
  },
};
