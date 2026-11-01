/* =====================================================================
   Supabase 접속 정보

   publishable key 는 브라우저에 넣으라고 만들어진 공개용 키다.
   테이블마다 RLS(행 수준 보안)를 켜 두었기 때문에 이 키만으로는
   정책이 허용한 범위 밖의 일을 할 수 없다.

   secret key 는 절대 여기에 넣지 않는다.
   ===================================================================== */
const SUPABASE_URL = 'https://wdinaocufdbylewdiyha.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DxVp0quvAGrwoD5xnKUxqA_BIh6Qs3h';
