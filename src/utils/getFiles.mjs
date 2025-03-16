import { readdirSync } from 'fs'

const getFiles = (path, end) =>{
return readdirSync(path).filter(f=>f.endsWith(end))

}

export  {getFiles}