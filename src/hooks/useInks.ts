import { useQuery } from '@tanstack/react-query';

import { DEFAULT_INK, INK_ORDER, inkOther, inks, type Ink, type InkName } from '../constants/theme';
import { getMyProfile } from '../services/authService';
import type { Who } from '../utils/who';
import { usePartnerProfile } from './usePartnerProfile';

export type PeopleInks = Record<Who, Ink>;

function toInkName(value: string | null | undefined): InkName {
  return value && value in inks ? (value as InkName) : DEFAULT_INK;
}

// 내 화면에서 쓸 잉크. 상대가 나와 같은 색을 골랐으면 상대를 팔레트의 다음 색으로 보여 준다(서로 구분되게).
export function resolveInks(myInk?: string | null, partnerInk?: string | null): PeopleInks {
  const me = toInkName(myInk);
  let partner = toInkName(partnerInk ?? 'sky');
  if (partner === me) partner = INK_ORDER[(INK_ORDER.indexOf(me) + 1) % INK_ORDER.length];
  return { me: inks[me], partner: inks[partner], other: inkOther };
}

// 내 잉크(내 프로필) + 지금 상대 잉크(상대 프로필). 프로필을 못 읽으면 기본값(라일락 / 스카이).
export function useInks(): PeopleInks & { myInk: InkName } {
  const me = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile, staleTime: 5 * 60_000 });
  const partner = usePartnerProfile();
  return {
    ...resolveInks(me.data?.ink, partner.data?.ink),
    myInk: toInkName(me.data?.ink),
  };
}
