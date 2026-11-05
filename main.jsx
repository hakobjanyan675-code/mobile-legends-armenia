import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && anon ? createClient(url, anon) : null;

function App() {
  const [teams, setTeams] = useState([]);
  const [pending, setPending] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadPublic() {
    if (!supabase) return;
    const { data, error } = await supabase.from('teams').select('id,team_name,players,created_at').eq('status','approved').order('created_at',{ascending:false});
    if (!error) setTeams(data || []);
  }
  async function loadAdmin() {
    if (!supabase || !session) return;
    const { data, error } = await supabase.from('teams').select('*').in('status',['pending','approved','rejected']).order('created_at',{ascending:false});
    if (error) setMessage('Ադմինի տվյալները բեռնել չհաջողվեց․ ստուգիր ադմինի իրավասությունները։');
    else setPending(data || []);
  }
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s) => setSession(s));
    loadPublic();
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => { loadAdmin(); }, [session]);

  async function register(e) {
    e.preventDefault(); if (!supabase) return setMessage('Կայքը դեռ միացված չէ Supabase-ին։');
    setBusy(true); setMessage('');
    const fd = new FormData(e.currentTarget);
    const team_name = String(fd.get('team_name')).trim();
    const contact = String(fd.get('contact')).trim();
    const players = Array.from({length:5},(_,i)=>({
      nickname:String(fd.get(`nickname${i}`)).trim(),
      game_id:String(fd.get(`game_id${i}`)).trim(),
      server_id:String(fd.get(`server_id${i}`)).trim()
    }));
    const {error} = await supabase.from('teams').insert({team_name,contact,players,status:'pending'});
    setBusy(false);
    if (error) setMessage('Գրանցումը չհաջողվեց։ Ստուգիր լրացված տվյալները և կրկին փորձիր։');
    else { e.currentTarget.reset(); setMessage('Գրանցումն ուղարկված է։ Թիմը կհայտնվի կայքում ադմինի հաստատումից հետո։'); }
  }
  async function signIn(e) {
    e.preventDefault(); if (!supabase) return;
    const {error} = await supabase.auth.signInWithPassword({email,password});
    setMessage(error ? 'Մուտքը չհաջողվեց․ ստուգիր էլ․ փոստն ու գաղտնաբառը։' : 'Մուտքը հաջողվեց։');
  }
  async function signOut() { await supabase.auth.signOut(); setPending([]); }
  async function setStatus(id,status) {
    const {error} = await supabase.from('teams').update({status}).eq('id',id);
    if (error) setMessage('Չհաջողվեց փոխել կարգավիճակը։ Ստուգիր ադմինի իրավասությունները։');
    else { setMessage('Կարգավիճակը թարմացվեց։'); await loadAdmin(); await loadPublic(); }
  }
  async function remove(id) {
    if (!confirm('Հեռացնե՞լ այս գրանցումը։')) return;
    const {error} = await supabase.from('teams').delete().eq('id',id);
    if (error) setMessage('Չհաջողվեց հեռացնել գրանցումը։');
    else { await loadAdmin(); await loadPublic(); }
  }

  return <><header><nav><div className="brand">MOBILE LEGENDS <b>ARMENIA</b></div><div className="links"><a href="#register">Գրանցում</a><a href="#teams">Թիմեր</a><a href="#admin">Ադմին</a></div></nav></header>
  <main className="wrap"><section className="hero"><div><div className="eyebrow">ARMENIAN ESPORTS COMMUNITY</div><h1>YOUR TEAM.<br/><em>YOUR VICTORY.</em></h1><p>Գրանցիր թիմդ Mobile Legends Armenia մրցաշարին։ Թիմերը կհայտնվեն հանրային ցանկում միայն ադմինի հաստատումից հետո։</p><div className="pills"><span>5 PLAYERS</span><span>MANUAL APPROVAL</span><span>MLBB TOURNAMENT</span></div></div><aside className="heroCard"><small>TOURNAMENT STATUS</small><h2>REGISTRATION</h2><p>Գրանցումները բաց են</p><hr/><small>Հաստատված թիմեր</small><strong>{teams.length}</strong></aside></section>
  {!supabase && <div className="warning">Կայքը պատրաստ է միացման, բայց Supabase-ի կարգավորումները դեռ լրացված չեն։ Հետևիր README.md-ի քայլերին։</div>}
  <div className="columns"><section className="panel" id="register"><div className="sectionTitle"><h2>Թիմի գրանցում</h2><span className="tag">5 PLAYERS</span></div><form onSubmit={register}><label>Թիմի անունը</label><input name="team_name" required maxLength="40" placeholder="Օրինակ՝ EREBUNI"/><label>Թիմի ղեկավարի Telegram username</label><input name="contact" required placeholder="@username"/>{Array.from({length:5},(_,i)=><div className="player" key={i}><h3>PLAYER {String(i+1).padStart(2,'0')}</h3><div className="fields"><div><label>Nickname</label><input name={`nickname${i}`} required maxLength="30" placeholder="In-game name"/></div><div><label>Game ID</label><input name={`game_id${i}`} required inputMode="numeric" placeholder="Player ID"/></div><div><label>Server ID</label><input name={`server_id${i}`} required inputMode="numeric" placeholder="Server"/></div></div></div>)}<button className="full" disabled={busy}>{busy?'Ուղարկվում է…':'Ուղարկել գրանցումը'}</button><p className="hint">Գրանցումից հետո թիմը կսպասի ադմինի հաստատմանը։</p></form></section>
  <section className="panel" id="teams"><div className="sectionTitle"><h2>Հաստատված թիմեր</h2><span className="tag">{teams.length} TEAMS</span></div><div className="teamList">{teams.length?teams.map(t=><Team key={t.id} team={t}/>):<div className="empty">Դեռ հաստատված թիմեր չկան։</div>}</div></section></div>
  <section className="panel admin" id="admin"><div className="sectionTitle"><h2>Ադմինիստրատորի վահանակ</h2><button className="secondary" onClick={()=>setAdminOpen(!adminOpen)}>Բացել / փակել</button></div>{adminOpen && <>{!session?<form className="login" onSubmit={signIn}><label>Ադմինի էլ․ փոստ</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label>Գաղտնաբառ</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="full">Մուտք գործել</button></form>:<><div className="adminBar">Մուտք գործած ադմին <button className="secondary" onClick={signOut}>Ելք</button></div><h3>Գրանցումներ</h3>{pending.length?pending.map(t=><div className="adminTeam" key={t.id}><Team team={t}/><div className="actions">{t.status!=='approved'&&<button className="approve" onClick={()=>setStatus(t.id,'approved')}>Հաստատել</button>}{t.status!=='rejected'&&<button className="secondary" onClick={()=>setStatus(t.id,'rejected')}>Մերժել</button>}<button className="remove" onClick={()=>remove(t.id)}>Հեռացնել</button></div></div>):<div className="empty">Գրանցումներ չկան։</div>}</>}</>}</section>
  {message&&<div className="message" role="status">{message}</div>}</main><footer>© MOBILE LEGENDS ARMENIA · COMMUNITY TOURNAMENTS</footer></>;
}
function Team({team}) { return <article className="team"><div className="teamTop"><h3>{team.team_name}</h3>{team.status&&<span className={`status ${team.status}`}>{team.status==='pending'?'ՍՊԱՍՈՒՄ Է':team.status==='approved'?'ՀԱՍՏԱՏՎԱԾ':'ՄԵՐԺՎԱԾ'}</span>}</div>{team.contact&&<p className="hint">Կապ՝ {team.contact}</p>}<div className="roster">{(team.players||[]).map((p,i)=><div className="member" key={i}><b>{i+1}. {p.nickname}</b><small>ID: {p.game_id} · Server: {p.server_id}</small></div>)}</div></article> }
createRoot(document.getElementById('root')).render(<App/>);
