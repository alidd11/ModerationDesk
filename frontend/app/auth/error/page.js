import Shell from '../../../components/Shell';

export default async function AuthErrorPage({ searchParams }) {
  const params = await searchParams;
  const reason = params?.reason || 'Discord sign-in could not be completed.';
  return <Shell compact><section className="section"><div className="card"><span className="badge warning">Authentication failed</span><h1>Discord sign-in was not completed</h1><p>{reason}</p><a className="button" href="/api/auth/login">Try again</a></div></section></Shell>;
}
