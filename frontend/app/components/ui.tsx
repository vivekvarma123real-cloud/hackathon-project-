'use client'
import {ButtonHTMLAttributes,ReactNode} from 'react'
import {cn} from '../../lib/utils'
export function Button({children,className='',variant='primary',...p}:{children:ReactNode;className?:string;variant?:'primary'|'secondary'|'danger'|'ghost'}&ButtonHTMLAttributes<HTMLButtonElement>){const v={primary:'bg-teal text-white hover:bg-tealDark',secondary:'bg-white text-ink border-2 border-line hover:border-teal',danger:'bg-danger/10 text-danger border-2 border-danger/20',ghost:'bg-transparent text-ink hover:bg-slate-100'}[variant];return <button type="button" className={cn('tap flex items-center justify-center gap-2 rounded-2xl px-7 py-4 font-bold text-[22px] transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none',v,className)} {...p}>{children}</button>}
export function Card({children,className=''}:{children:ReactNode;className?:string}){return <div className={cn('rounded-[28px] bg-white border border-line shadow-[0_14px_45px_rgba(16,42,67,.08)]',className)}>{children}</div>}
export function Icon({children}:{children:ReactNode}){return <div className="w-20 h-20 rounded-3xl bg-teal/10 text-teal flex items-center justify-center text-4xl mx-auto">{children}</div>}

export function Keyboard({value, onChange}:{value:string; onChange:(v:string)=>void}) {
  const rows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M']
  ];
  
  const handleKey = (k:string) => onChange(value + k);
  const handleDel = () => onChange(value.slice(0, -1));
  const handleSpace = () => onChange(value + ' ');

  return (
    <div className="keyboard-container" style={{display:'flex', flexDirection:'column', gap:'12px', marginTop:'16px', background:'#f1f5f9', padding:'24px', borderRadius:'24px'}}>
      {rows.map((row, i) => (
        <div key={i} style={{display:'flex', justifyContent:'center', gap:'12px'}}>
          {row.map(k => (
            <button type="button" key={k} onClick={()=>handleKey(k)} style={{background:'#fff', border:'1px solid #cbd5e1', borderRadius:'12px', width:'68px', height:'78px', fontSize:'32px', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 6px rgba(0,0,0,0.05)'}}>{k}</button>
          ))}
        </div>
      ))}
      <div style={{display:'flex', justifyContent:'center', gap:'12px'}}>
        <button type="button" onClick={handleSpace} style={{background:'#fff', border:'1px solid #cbd5e1', borderRadius:'12px', width:'380px', height:'78px', fontSize:'28px', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 6px rgba(0,0,0,0.05)'}}>Space</button>
        <button type="button" onClick={handleDel} style={{background:'#e2e8f0', border:'1px solid #cbd5e1', borderRadius:'12px', width:'150px', height:'78px', fontSize:'26px', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 6px rgba(0,0,0,0.05)'}}>Del</button>
      </div>
    </div>
  );
}
