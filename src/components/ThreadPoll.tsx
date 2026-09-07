import { BarChart3, Check } from 'lucide-react'
import { useState } from 'react'
import { votePoll } from '../api/advanced'
import type { PollData } from '../lib/types'

export default function ThreadPoll({poll}:{poll:PollData}){
  const[data,setData]=useState(poll);const[busy,setBusy]=useState('');const[status,setStatus]=useState('')
  const vote=async(optionId:string)=>{if(busy||data.myOptionId===optionId)return;setBusy(optionId);setStatus('');const previous=data;const previousId=data.myOptionId??null
    setData(current=>({...current,myOptionId:optionId,totalVotes:current.totalVotes+(previousId?0:1),options:current.options.map(option=>({...option,votes:option.votes+(option.id===optionId?1:0)-(previousId===option.id?1:0)}))}))
    try{await votePoll(data.id,optionId)}catch(e){setData(previous);setStatus(e instanceof Error?e.message:'Falha ao votar.')}finally{setBusy('')}
  }
  return <section className="thread-poll" aria-label="Enquete"><header><BarChart3 size={16}/><strong>{data.question}</strong></header><div>{data.options.map(option=>{const percent=data.totalVotes?Math.round(option.votes/data.totalVotes*100):0;const selected=data.myOptionId===option.id;return <button key={option.id} className={selected?'selected':''} disabled={Boolean(busy)} onClick={()=>void vote(option.id)}><span className="poll-fill" style={{width:`${percent}%`}}/><span className="poll-label">{selected&&<Check size={13}/>} {option.label}</span><b>{percent}%</b></button>})}</div><footer><span>{data.totalVotes} {data.totalVotes===1?'voto':'votos'}</span>{data.endsAt&&<span>{new Date(data.endsAt)>new Date()?'Em andamento':'Encerrada'}</span>}</footer>{status&&<small className="inline-status">{status}</small>}</section>
}
