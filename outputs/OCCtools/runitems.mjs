const text=v=>typeof v==='string'?v:typeof v?.Value==='string'?v.Value:'';
export function checklistLink(value){
 try{const u=new URL(typeof value==='string'?value:value?.Url||value?.URL);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
export function normalizeRunitem(t){
 const order=t.SortOrder;
 return {ID:t.ID,Title:text(t.Title),Run:typeof t.Run==='string'?t.Run:{Id:t.Run?.Id,Value:text(t.Run)},FlightDate:t.FlightDate,
  Description:text(t.Description)||text(t.Info),Info:text(t.Info),Link:checklistLink(t.Link)||checklistLink(t.URL),
  SortOrder:order!==null&&order!==undefined&&String(order).trim()!==''&&Number.isFinite(Number(order))?Number(order):null,
  Day:t.Day||t.Code||t.Duty,Completed:t.Completed,Done:t.Done,Status:text(t.Status)};
}
