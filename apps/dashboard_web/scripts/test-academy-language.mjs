import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild');
const bundled=await build({entryPoints:['src/lib/academyLanguage.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {academyText,academyFeedback,authorText,updateAuthorText,LANGUAGE_SEPARATOR:S}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const en=(a,b)=>a,he=(a,b)=>b,option=`Disconnect power${S}נתקו מתח`;
assert.equal(academyText(option,en),'Disconnect power');
assert.equal(academyText(option,he),'נתקו מתח');
for(const separator of ['\r\n---HE---\r\n',' ---HE--- ','\n---HE---\n']){
  assert.equal(academyText(`Disconnect power${separator}נתקו מתח`,he),'נתקו מתח');
  assert.equal(updateAuthorText(`Disconnect power${separator}נתקו מתח`,'נתקו סוללה','he'),`Disconnect power${separator}נתקו סוללה`);
}
assert.equal(option,`Disconnect power${S}נתקו מתח`,'display must preserve stored option identity');
assert.equal(authorText(option,'he'),'נתקו מתח');
assert.equal(updateAuthorText(option,'נתקו סוללה','he'),`Disconnect power${S}נתקו סוללה`);
assert.equal(updateAuthorText(option,'Disconnect battery','en'),`Disconnect battery${S}נתקו מתח`);
assert.equal(academyText(`Only English${S}`,he),'Only English (תרגום אינו זמין)');
assert.equal(academyText('Custom author content',he),'Custom author content');
assert.equal(academyFeedback('Knowledge check passed / בדיקת הידע עברה. 9/10',he),'בדיקת הידע עברה. 9/10');
assert.equal(academyFeedback('Review the lesson and retry / חזרו לשיעור ונסו שוב. Review questions / שאלות לחזרה: 2',en),'Review the lesson and retry. Review questions: 2');
assert.equal(academyFeedback('Human reviewer: check CAN / בדקו CAN',he),'Human reviewer: check CAN / בדקו CAN');
console.log('PASS preferred-language display, missing translation, preserved answer identity and author translations, localized generated feedback');
