---
title: "피파 프로클럽 대시보드: Raw 데이터 처리와 Optimistic UI"
description: "게임과 같은 실시간 반응성을 위한 웹 "
pubDate: 2025-04-30T00:00:00.000Z
notionId: "2af7cf19-a364-8004-a41a-dc5735d98b2b"
---
## 들어가며


축구 프로클럽 토너먼트를 관리하는 **게임과 같은 실시간 대시보드**를 React + TypeScript로 개발하면서, **의도적으로 React Query를 사용하지 않고** 모든 기능을 직접 구현해보았습니다.


이 과정은 단순히 기능을 만드는 것을 넘어, **React Query가 내부적으로 어떻게 동작하는지, 왜 필요한지를 몸소 체험하는 딥다이브**가 되었습니다.


**FootballSquare**는 온라인 축구팀 매칭 플랫폼으로, 주로 FIFA 시리즈의 **FC 프로클럽(Football Club Pro Clubs)** 모드를 기반으로 합니다.


**FC 프로클럽 사용자를 대상으로 플랫폼을 보여주고 있다보니 게임처럼 만드는 것이 웹의 핵심이었습니다.**


## 🎯 왜 React Query를 사용하지 않았을까?


### React Query 딥다이브를 위한 전략적 선택


프로젝트를 시작하면서 **의도적으로 React Query를 배제**하기로 결정했습니다. 그 이유는:

1. **내부 동작 원리 이해**: React Query가 해결하는 문제를 직접 경험하고 싶었습니다.
2. **기본기 강화**: 상태 관리, 캐싱, 동기화 등 근본적인 개념을 직접 구현하며 학습
3. **필요성 체감**: 왜 이런 라이브러리가 존재하는지 몸소 이해하기 위해

이는 마치 **프레임워크 없이 순수 JavaScript로 개발해보는 것**과 같은 학습 방법입니다.


### 핵심 기술적 도전 과제

1. **비순차적 Raw 데이터**를 리그/토너먼트 구조로 실시간 변환
2. 매치 생성·삭제·스코어 수정 시 **0-latency 반응**
3. **프론트엔드에서 복잡한 데이터 연산** 수행
4. 패배팀·부전승(BYE)·더미 매치를 자동으로 처리

이 모든 것을 **React Query 없이 직접 구현**해야 했습니다.


## 🔧 1단계: 기본 상태 관리부터 시작


### 초기 문제 상황


```javascript
// 가장 기본적인 접근
const createMatch = async (matchData) => {
  await postMatch(matchData); // 평균 800ms 대기 😱
  const fullData = await getMatches(); // 또 다른 요청
  window.location.reload(); // 전체 상태 초기화
}
```


**문제점들:**

1. DB JOIN이 포함된 복잡한 응답으로 인한 **평균 800ms 지연**
2. 전체 페이지 새로고침으로 **게임 같은 부드러운 경험 불가능**
3. 매치 하나 생성하려면 **두 번의 API 호출** 필요

이 문제를 해결하기 위해, React Query가 내부적으로 처리하는 것들을 **하나하나 직접 구현**하기 시작했습니다.


## 💡 2단계: Optimistic UI 직접 구현


React Query의 `useMutation` + `onMutate`가 하는 일을 직접 구현했습니다.


### 깨달음 1: 백업과 복원의 복잡성


```typescript
const useGetChampionshipMatchListHandler = () => {
  const originalData = useRef<RawMatchData[]>([]);
  const backupData = useRef<RawMatchData[]>([]);
  const [rawMatches, setRawMatches] = useState<RawMatchData[]>([]);

  // Optimistic Update: 즉시 반영
  const handleOptimisticCreate = useCallback((matchData: CreateMatchRequest) => {
    const tempId = `temp_${Date.now()}`;
    const optimisticMatch: RawMatchData = {
      id: -Math.abs(tempId),
      ...matchData,
      isOptimistic: true,
      createdAt: new Date().toISOString()
    };

    // React Query의 onMutate가 하는 일
    backupData.current = [...rawMatches]; // 백업!
    setRawMatches(prev => [...prev, optimisticMatch]); // 즉시 반영!

    return tempId;
  }, [rawMatches]);

  // React Query의 onSuccess가 하는 일
  const handleCommitMatches = useCallback((response: CreateMatchResponse, tempId: string) => {
    setRawMatches(prev =>
      prev.map(match =>
        match.isOptimistic && match.tempId === tempId
          ? { ...match, id: response.matchId, isOptimistic: false }
          : match
      )
    );

    originalData.current = rawMatches;
  }, [rawMatches]);

  // React Query의 onError가 하는 일
  const handleRollback = useCallback((tempId: string) => {
    if (backupData.current) {
      setRawMatches(backupData.current); // 롤백!
    }
  }, []);

  return {
    rawMatches,
    handleOptimisticCreate,
    handleCommitMatches,
    handleRollback
  };
};
```


**이 과정에서 깨달은 것:**

- **백업 타이밍**: 언제 백업하고 언제 복원할지 정확히 제어해야 함
- **임시 ID 관리**: 서버 ID와 임시 ID를 어떻게 매핑할지 고민
- **에러 케이스**: 여러 mutation이 동시에 발생하면 어떻게 처리할지

이것이 바로 **React Query의** **`useMutation`****이 자동으로 해주는 일**입니다!


### 실제 사용


```typescript
const usePostCreateChampionshipMatchHandler = () => {
  const { handleOptimisticCreate, handleCommitMatches, handleRollback } =
    useGetChampionshipMatchListHandler();

  const createMatch = async (matchData: CreateMatchRequest) => {
    // 1. 즉시 UI 반영 (0ms)
    const tempId = handleOptimisticCreate(matchData);

    try {
      // 2. 백그라운드에서 최소 데이터만 전송
      const response = await postMatch({
        title: matchData.title,
        teamIds: matchData.teamIds,
        tempId
      });

      // 3. 성공 시 ID만 동기화
      handleCommitMatches(response, tempId);

    } catch (error) {
      // 4. 실패 시 즉시 롤백
      handleRollback(tempId);
      toast.error('매치 생성에 실패했습니다.');
    }
  };

  return { createMatch };
};
```


## 😰 3단계: 캐싱의 필요성 체감


### 문제: 탭 전환마다 다시 fetch


```typescript
// 문제 상황
function TournamentTabs() {
  const [activeTab, setActiveTab] = useState('MATCHES');

  return (
    <>
      {activeTab === 'MATCHES' && <MatchesView />}  // fetch!
      {activeTab === 'TEAMS' && <TeamsView />}      // fetch!
      {activeTab === 'MATCHES' && <MatchesView />}  // 다시 fetch! 😱
    </>
  );
}
```


### 깨달음 2: 캐싱 로직 직접 구현


```typescript
// React Query의 캐싱을 직접 구현
const useManualCache = () => {
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const STALE_TIME = 5 * 60 * 1000; // 5분

  const getCachedData = useCallback((key: string) => {
    const cached = cacheRef.current.get(key);

    if (!cached) return null;

    const isStale = Date.now() - cached.timestamp > STALE_TIME;

    if (isStale) {
      cacheRef.current.delete(key);
      return null;
    }

    return cached.data; // 캐시 히트! ⚡
  }, []);

  const setCachedData = useCallback((key: string, data: any) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, []);

  return { getCachedData, setCachedData };
};
```


**이 과정에서 깨달은 것:**

- **캐시 키 관리**: 어떤 기준으로 캐시를 구분할지 (React Query의 `queryKey`)
- **Stale Time**: 언제까지 캐시를 신선하다고 볼지 (React Query의 `staleTime`)
- **메모리 관리**: 캐시가 무한정 쌓이면 메모리 누수 발생

이것이 바로 **React Query의 캐싱 시스템**입니다!


### 캐싱 적용


```typescript
const useGetChampionshipMatchListWithCache = (championshipId: number) => {
  const { getCachedData, setCachedData } = useManualCache();
  const [rawMatches, setRawMatches] = useState<RawMatchData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const cacheKey = `championship-matches-${championshipId}`;

  useEffect(() => {
    const fetchMatches = async () => {
      // 1. 캐시 확인
      const cached = getCachedData(cacheKey);

      if (cached) {
        setRawMatches(cached); // 즉시 표시! ⚡
        return;
      }

      // 2. 캐시 미스: API 호출
      setIsLoading(true);
      try {
        const data = await getMatches(championshipId);
        setRawMatches(data);
        setCachedData(cacheKey, data); // 캐시 저장
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [championshipId]);

  return { rawMatches, isLoading };
};
```


## 🤯 4단계: 전역 상태 동기화의 지옥


### 문제: 같은 데이터를 여러 곳에서 사용


```typescript
// 문제 상황
function MatchList() {
  const { rawMatches } = useGetChampionshipMatchListHandler();
  // rawMatches A
}

function MatchStatistics() {
  const { rawMatches } = useGetChampionshipMatchListHandler();
  // rawMatches B (별도의 상태!)
}

// 한쪽에서 업데이트하면 다른 쪽은 모른다 😱
```


### 깨달음 3: 전역 캐시 관리의 복잡성


```typescript
// React Query의 QueryClient를 직접 구현
class ManualQueryClient {
  private cache: Map<string, any> = new Map();
  private subscribers: Map<string, Set<Function>> = new Map();

  // 데이터 가져오기
  getQueryData(key: string) {
    return this.cache.get(key);
  }

  // 데이터 설정 + 구독자들에게 알림
  setQueryData(key: string, data: any) {
    this.cache.set(key, data);

    // 모든 구독자에게 업데이트 알림! (React Query가 하는 일)
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback(data));
    }
  }

  // 구독 (컴포넌트가 해당 데이터를 사용함을 등록)
  subscribe(key: string, callback: Function) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    // cleanup 함수 반환
    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  // 캐시 무효화 (React Query의 invalidateQueries)
  invalidateQueries(key: string) {
    this.cache.delete(key);
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback(undefined)); // refetch 트리거
    }
  }
}

const queryClient = new ManualQueryClient();
```


**이 과정에서 깨달은 것:**

- **구독 패턴**: 데이터가 변경되면 모든 사용처에 자동으로 알림
- **단일 소스**: 하나의 캐시를 여러 컴포넌트가 공유
- **자동 동기화**: 한 곳에서 업데이트하면 모든 곳에 반영

이것이 바로 **React Query의 QueryClient**입니다!


### 전역 캐시 사용


```typescript
const useQuery = (key: string, queryFn: () => Promise<any>) => {
  const [data, setData] = useState(queryClient.getQueryData(key));
  const [isLoading, setIsLoading] = useState(!data);

  useEffect(() => {
    // 구독 등록
    const unsubscribe = queryClient.subscribe(key, (newData: any) => {
      setData(newData);
    });

    // 데이터 fetch
    const fetchData = async () => {
      if (data) return; // 캐시 있으면 스킵

      setIsLoading(true);
      try {
        const result = await queryFn();
        queryClient.setQueryData(key, result); // 전역 캐시에 저장
        setData(result);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return unsubscribe; // cleanup
  }, [key]);

  return { data, isLoading };
};

// 이제 어디서든 같은 데이터를 공유! ⚡
function MatchList() {
  const { data } = useQuery('championship-matches-1', () => getMatches(1));
}

function MatchStatistics() {
  const { data } = useQuery('championship-matches-1', () => getMatches(1));
  // 같은 데이터! 자동 동기화!
}
```


## 😫 5단계: 수동 로딩/에러 처리의 반복


### 깨달음 4: 보일러플레이트의 지옥


```typescript
// 모든 API 호출마다 이런 코드를 반복...
const useGetMatches = (championshipId: number) => {
  const [data, setData] = useState<RawMatchData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getMatches(championshipId);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [championshipId]);

  return { data, isLoading, error };
};

// 팀 데이터도...
const useGetTeams = (championshipId: number) => {
  const [data, setData] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 똑같은 코드 반복... 😱
};

// 플레이어 데이터도...
const useGetPlayers = (championshipId: number) => {
  // 또 반복... 😱
};
```


**깨달은 것:**

- React Query는 이런 반복을 **단 몇 줄로** 처리
- 로딩/에러 상태 관리를 자동화
- 재시도, 재검증 등 고급 기능도 포함

## 🎯 6단계: 의존성 관리의 복잡성


### 문제: 연관 데이터의 수동 업데이트


```typescript
// 매치가 업데이트되면...
const useUpdateMatch = () => {
  const { setRawMatches } = useGetChampionshipMatchListHandler();
  const { setTeamStats } = useGetTeamStatsHandler();
  const { setRankings } = useGetRankingsHandler();
  const { setPlayerStats } = useGetPlayerStatsHandler();

  const updateMatch = async (matchId: number, score: Score) => {
    // 1. 매치 업데이트
    const updatedMatch = await putMatch(matchId, score);
    setRawMatches(prev => /* 업데이트 로직 */);

    // 2. 팀 통계 수동으로 재계산 😱
    const newTeamStats = calculateTeamStats(/* ... */);
    setTeamStats(newTeamStats);

    // 3. 랭킹도 수동으로 재계산 😱
    const newRankings = calculateRankings(/* ... */);
    setRankings(newRankings);

    // 4. 플레이어 통계도... 😱
    const newPlayerStats = calculatePlayerStats(/* ... */);
    setPlayerStats(newPlayerStats);

    // 하나라도 빠뜨리면 버그!
    // 순서가 틀려도 버그!
    // 계산 로직이 틀려도 버그!
  };
};
```


### 깨달음 5: Invalidation의 강력함


```typescript
// React Query였다면...
const useUpdateMatch = () => {
  return useMutation({
    mutationFn: (data) => putMatch(data.matchId, data.score),
    onSuccess: () => {
      // 단 한 줄로 모든 연관 데이터 자동 갱신! ⚡
      queryClient.invalidateQueries(['championship', 'matches']);

      // 의존하는 모든 쿼리가 자동으로 refetch:
      // - teamStats
      // - rankings
      // - playerStats
      // 순서 걱정 없음! 누락 걱정 없음!
    }
  });
};
```


## 🤔 프론트엔드에서 Raw 데이터 연산의 정당성


### 토스 개발진과의 대화


직무박람회에서 토스 백엔드 개발진에게 물어봤습니다:

> "Raw 데이터를 프론트에서 가공해서 보여주는 게 바람직한 접근일까요?"

**답변**: _"매우 바람직합니다. 요즘 프론트엔드는 단순히 보여주기만 하지 않아요. 사용자 경험을 위해 클라이언트에서 적극적으로 데이터를 가공하고 최적화하는 것이 트렌드입니다."_


### 클라이언트 사이드 연산 + 캐싱


```typescript
const TournamentDashboard = () => {
  // 직접 구현한 캐시에서 데이터 가져오기
  const { data: rawMatches } = useQuery(
    'championship-matches-1',
    () => getMatches(1)
  );

  // 클라이언트에서 연산 (useMemo로 최적화)
  const processedData = useMemo(() => {
    if (!rawMatches) return null;

    console.time('Data Processing');
    const result = convertToMatchData(rawMatches, championshipType);
    console.timeEnd('Data Processing'); // 여전히 5ms 이하

    return result;
  }, [rawMatches, championshipType]);

  return <TournamentBracket data={processedData} />;
};
```


**깨달은 것:**

- 서버 부하 분산 + 즉각적인 UI 반응
- 하지만 이 모든 것이 **제대로 된 캐싱 시스템이 있을 때만** 효율적
- React Query 없이는 캐싱 시스템 구축이 너무 복잡

## 📊 React Query 직접 구현 vs 실제 React Query


| 구현 내용             | 직접 구현 (내가 한 것)    | React Query            |
| ----------------- | ----------------- | ---------------------- |
| Optimistic Update | 200줄 + 복잡한 ref 관리 | `onMutate` 몇 줄         |
| 캐싱 시스템            | 100줄 + Map 관리     | `queryKey` 자동          |
| 전역 상태 동기화         | 구독 패턴 직접 구현       | 자동 동기화                 |
| 로딩/에러 처리          | 매번 반복 코드          | 자동 제공                  |
| 의존성 관리            | 수동 계산 + 업데이트      | `invalidateQueries`    |
| 백그라운드 동기화         | 직접 구현 필요          | `refetchInterval`      |
| Window Focus      | 직접 구현 필요          | `refetchOnWindowFocus` |
| Retry 로직          | 직접 구현 필요          | `retry` 옵션             |
| **총 코드량**         | **~1000줄**        | **~50줄**               |


## 🎓 React Query 딥다이브의 교훈


### 왜 이런 방식으로 학습했는가?


**바닐라 JS → React → React Query**


저는 기술의 필요성을 직접 체감하는 방식을 선호합니다:

1. **문제 경험**: 먼저 문제를 직접 겪어봐야 함
2. **직접 구현**: 해결책을 스스로 만들어봐야 함
3. **한계 체감**: 내 구현의 한계를 느껴봐야 함
4. **도구 이해**: 그래야 라이브러리가 해결하는 것을 진정으로 이해

### React Query가 해결하는 본질적인 문제들


이 프로젝트를 통해 React Query의 핵심 가치를 이해했습니다:


**1. Optimistic UI**


```typescript
// 내가 구현: 200줄의 복잡한 로직
// React Query: onMutate 콜백 하나

// 하지만 원리는 같다!
// - 백업 (내가 한 것: useRef, React Query: context)
// - 즉시 반영 (내가 한 것: setState, React Query: setQueryData)
// - 롤백 (내가 한 것: 수동, React Query: onError)
```


**2. 캐싱**


```typescript
// 내가 구현: Map + timestamp + stale 체크
// React Query: queryKey + staleTime

// 하지만 원리는 같다!
// - 캐시 키로 데이터 식별
// - 신선도 체크
// - 만료된 데이터 제거
```


**3. 전역 동기화**


```typescript
// 내가 구현: 구독 패턴 + 수동 알림
// React Query: QueryClient

// 하지만 원리는 같다!
// - 하나의 소스
// - 여러 컴포넌트가 구독
// - 변경 시 자동 알림
```


**4. Invalidation**


```typescript
// 내가 구현: 수동으로 모든 연관 데이터 업데이트
// React Query: invalidateQueries 한 줄

// 이게 가장 큰 차이!
// React Query는 의존성 그래프를 자동 관리
```


### 얻은 깊은 이해


**Before (React Query 사용만 함):**


```typescript
// 그냥 사용만 했다면...
const { data } = useQuery(['matches'], getMatches);
// "오, 편하네!" (끝)
```


**After (직접 구현 후):**


```typescript
// 직접 구현해본 후...
const { data } = useQuery(['matches'], getMatches);
// "아, 내부적으로 QueryClient에 캐싱하고,
//  구독자들에게 알림 보내고,
//  staleTime 체크하고,
//  백그라운드에서 refetch하는구나!"
```


## 🚀 다음 단계: React Query 도입 결정


이제 **왜 React Query가 필요한지** 완벽히 이해했습니다.


### 도입 계획


```typescript
// 1. 기존 커스텀 훅을 React Query로 마이그레이션
// Before
const { rawMatches, handleOptimisticCreate, handleCommitMatches, handleRollback } =
  useGetChampionshipMatchListHandler(); // 200줄

// After
const { data: rawMatches } = useQuery({
  queryKey: ['championship', 'matches', championshipId],
  queryFn: () => getMatches(championshipId)
}); // 4줄

const createMatch = useMutation({
  mutationFn: postMatch,
  onMutate: async (newMatch) => {
    await queryClient.cancelQueries(['championship', 'matches']);
    const previous = queryClient.getQueryData(['championship', 'matches']);
    queryClient.setQueryData(['championship', 'matches'], (old) => [...old, newMatch]);
    return { previous };
  },
  onError: (err, newMatch, context) => {
    queryClient.setQueryData(['championship', 'matches'], context.previous);
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['championship', 'matches']);
  }
}); // 15줄 (훨씬 더 강력하면서도 짧음)
```


### 직접 구현한 코드의 운명


직접 구현한 1000줄의 코드는 삭제될 것입니다. 하지만:

- **낭비가 아닙니다**
- 이 과정이 없었다면 React Query를 제대로 이해하지 못했을 것입니다
- "왜 이렇게 동작하는가?"를 아는 것과 "그냥 사용하는 것"의 차이

## 마무리: 딥다이브의 진정한 가치


**React Query 없이 개발하며 얻은 것:**

1. **Optimistic UI의 원리**: 백업-반영-동기화-롤백의 사이클
2. **캐싱 시스템**: 키 관리, 신선도 체크, 메모리 관리
3. **전역 상태 동기화**: 구독 패턴과 단일 소스의 중요성
4. **의존성 관리**: Invalidation이 왜 강력한지
5. **React Query의 가치**: 단순한 편의성이 아닌 **근본적인 문제 해결**

### 추천하는 학습 경로


```plain text
1. React Query 문서 읽기 (1시간)
   ↓
2. 간단한 프로젝트에 적용 (1일)
   ↓
3. "이게 내부적으로 어떻게 동작하지?" 의문
   ↓
4. 직접 구현해보기 (1주일) ← 여기서 진짜 배움
   ↓
5. React Query로 다시 마이그레이션 (1일)
   ↓
6. 깊은 이해와 함께 활용 ⚡
```


**"도구를 진정으로 이해하는 방법은 그것 없이 살아보는 것이다."**


이 프로젝트를 통해 React Query는 단순한 "편한 라이브러리"가 아니라, **복잡한 데이터 동기화 문제를 해결하는 정교한 시스템**임을 깨달았습니다.


---


_React Query 딥다이브나 직접 구현 경험에 관심 있는 분들과 이야기 나누고 싶습니다. 댓글로 의견 공유해주세요! ⚽️_

