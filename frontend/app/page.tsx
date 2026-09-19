'use client'
import {useEffect} from 'react'
import {useKioskStore} from '../lib/store'
import {Check} from 'lucide-react'
import {KioskHeader,Progress,BottomBar,StaffHelp} from './components/chrome'
import {Intro,VoiceSelection,Consent,Identify,Interview,Documents,ScanDocument,Review,Ready} from './components/screens'
export default function Home(){const {step,reset}=useKioskStore();useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')reset()};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[reset]);return <div className="kiosk-shell"><KioskHeader/><Progress/><main className="screen fade">{step===0&&<Intro/>}{step===1&&<VoiceSelection/>}{step===2&&<Consent/>}{step===3&&<Identify/>}{step===4&&<Interview/>}{step===5&&<Documents/>}{step===6&&<ScanDocument/>}{step===7&&<Review/>}{step===8&&<Ready/>}</main><BottomBar/><StaffHelp/></div>}
