import axios from 'axios'
import fs from 'node:fs'
import crypto from 'node:crypto'





async function getHtmlContent(){
  const response = await axios.get('http://localhost:4173/')
  return response.data
}

async function start(){
  const htmlContent = await getHtmlContent()
  const algo = 'sha384'
  const hash = crypto.createHash(algo).update(htmlContent).digest('base64')
  const integrity = fs.readFileSync('./integrity.txt', 'utf-8')
  if(integrity !== hash){
    console.log('文件可能被入侵，报警邮件，短信')
  }else{
    console.log('文件未被入侵', new Date().toISOString())
  }

}

setInterval(start, 1000)


