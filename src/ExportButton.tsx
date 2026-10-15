import {useRef,useState} from 'preact/hooks';
import {downloadTable,type TableExport} from './report-xlsx';
export function ExportButton({busy,setWorking,build,name}:{busy:boolean;setWorking:(b:boolean)=>void;build:()=>Promise<TableExport>|TableExport;name:string}){
 const running=useRef(false),[error,setError]=useState('');
 async function run(){if(busy||running.current)return;running.current=true;setWorking(true);setError('');try{downloadTable(await build(),name);}catch(e){setError((e as Error).message);}finally{running.current=false;setWorking(false);}}
 return <div class="export-control"><button type="button" class="secondary" disabled={busy} onClick={()=>void run()}>Descargar Excel completo</button>{error&&<p class="error" role="alert">{error}</p>}</div>;
}
