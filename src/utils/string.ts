/**
 * Generate random string
 * - default length is 10
 */
export function randomString(len: number = 10, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string {
  if(len < 1) len = 10
  if(charset === '0-9')
    charset = '0123456789'

  let code = ''
  for(let i = 0; i < len; i++)
    code += charset.charAt(Math.floor(Math.random() * charset.length))

  return code
}