export function isFoxx(){
  let is = false
  try {
    let l = require('@arangodb/locals')
    is = !!(l && l.context)
  } catch(e){}
  return is
}