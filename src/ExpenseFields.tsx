import type {Category,ExpenseDraft} from './expense-model';
import {money} from './operations-model';
export function ExpenseFields({categories,draft,onChange,review}:{categories:Category[];draft:ExpenseDraft;onChange:(d:ExpenseDraft)=>void;review:boolean}){
 const set=(key:keyof ExpenseDraft,value:string)=>onChange({...draft,[key]:value});
 return <fieldset class="form-wrapper" disabled={review}>
 <label>Categoría<select aria-label="Categoría del gasto" value={draft.categoriaId} onChange={e=>set('categoriaId',e.currentTarget.value)}><option value="">Elegí una categoría</option>{categories.filter(c=>c.activo).map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
 {!categories.some(c=>c.activo)&&<p class="notice">No hay categorías activas. El administrador debe crear una categoría antes de registrar gastos.</p>}
 <label>Fecha del gasto<input aria-label="Fecha del gasto" type="date" value={draft.fecha} onInput={e=>set('fecha',e.currentTarget.value)}/></label>
 <label>Descripción<textarea aria-label="Descripción del gasto" maxLength={500} value={draft.descripcion} onInput={e=>set('descripcion',e.currentTarget.value)}/></label>
 <label>Medio de pago<select aria-label="Medio del gasto" value={draft.medio} onChange={e=>set('medio',e.currentTarget.value)}><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="MERCADO_PAGO">Mercado Pago</option></select></label>
 <label>Importe<input aria-label="Importe del gasto" inputMode="decimal" value={draft.importe} onInput={e=>set('importe',e.currentTarget.value)}/></label>
 <label>Referencia (opcional)<input aria-label="Referencia del gasto" maxLength={100} value={draft.referencia} onInput={e=>set('referencia',e.currentTarget.value)}/></label>
 <p class="notice">{draft.medio==='EFECTIVO'?'Este gasto reduce el efectivo esperado de la jornada.':'Este gasto se registra en el medio elegido y no reduce el efectivo esperado.'}</p>
 {review&&<p><strong>Total a registrar: {money(Number(draft.importe.trim().replace(',','.')))}</strong></p>}
 </fieldset>;
}
