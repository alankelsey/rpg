const stats = ['Strength','Endurance','Charisma','Intelligence','Cunning','Mental Fortitude','Perception','Luck','Dexterity','Empathy'];
const groups = {Body:['Strength','Endurance','Dexterity'],Mind:['Intelligence','Cunning','Mental Fortitude','Perception'],Connection:['Charisma','Empathy','Luck']};
const archetypes = [
 ['Rags to riches','Clawed up from poverty; wealth is a fortress built over a fear that never fully leaves.','Mental Fortitude,15|Endurance,10|Charisma,-15|Empathy,-10'],
 ['Trust fund baby','Money has always been there; freedom from survival brings the question of what they can earn alone.','Charisma,15|Luck,10|Mental Fortitude,-15|Endurance,-10'],
 ['Blue collar','Raised on visible work; respects competence and people who show up.','Endurance,15|Dexterity,10|Charisma,-15|Cunning,-10'],
 ['Recovered addict','Clawed back lost years one day at a time, with hard-won honesty.','Mental Fortitude,15|Perception,10|Endurance,-15|Charisma,-10'],
 ['Middle-class family','A safe upbringing created its own pressure to find meaning or risk.','Intelligence,15|Charisma,10|Mental Fortitude,-15|Cunning,-10'],
 ['Old money / aristocrat','Raised with inherited prestige, buried rules, and effortless manners.','Charisma,15|Intelligence,10|Empathy,-15|Endurance,-10'],
 ['New money / self-made','Built a fortune and still feels driven to prove they belong.','Intelligence,15|Luck,10|Charisma,-15|Empathy,-10'],
 ['Riches to rags (fallen)','Knew the top, lost it, and measures every room against what came before.','Perception,15|Cunning,10|Charisma,-15|Mental Fortitude,-10'],
 ['Scholarship kid','Fluent in two worlds, fully at home in neither.','Intelligence,15|Perception,10|Charisma,-15|Endurance,-10'],
 ['Immigrant / first-generation','Carries family sacrifice, obligation, and two cultures at once.','Mental Fortitude,15|Perception,10|Charisma,-15|Luck,-10'],
 ['Orphan / foster system','Learned to build family rather than inherit it.','Cunning,15|Perception,10|Empathy,-15|Luck,-10'],
 ['Single-parent raised','One parent carried the load; loyalty and early adulthood followed.','Empathy,15|Mental Fortitude,10|Luck,-15|Charisma,-10'],
 ['Nepo kid / showbiz family','Born with an open door and a famous shadow.','Charisma,15|Luck,10|Mental Fortitude,-15|Cunning,-10'],
 ['Born into the life','Family trade was crime, and loyalty came before law.','Cunning,15|Perception,10|Empathy,-15|Charisma,-10'],
 ['Cult / strict religious upbringing','Raised within a closed system whose language still shapes them.','Mental Fortitude,15|Charisma,10|Intelligence,-15|Perception,-10'],
 ['Military brat','Adaptable and rootless after years of new towns.','Perception,15|Endurance,10|Charisma,-15|Empathy,-10'],
 ['War veteran','Returned with discipline and loss in equal measure.','Strength,15|Mental Fortitude,10|Empathy,-15|Charisma,-10'],
 ['Ex-con / did time','Paid a debt in years and faces a world that remembers.','Cunning,15|Mental Fortitude,10|Charisma,-15|Luck,-10'],
 ['Overcame illness/disability','Knows the value of patience, humor, and effort.','Mental Fortitude,15|Empathy,10|Strength,-15|Endurance,-10'],
 ['Child prodigy / groomed for greatness','Gifted early; now asks who they are beyond the applause.','Intelligence,15|Dexterity,10|Charisma,-15|Mental Fortitude,-10'],
 ['Refugee / displaced','Carries a lost home and a fierce grip on what can be rebuilt.','Endurance,15|Cunning,10|Charisma,-15|Luck,-10']
].map(([name,summary,effects])=>({name,summary,effects:parseEffects(effects)}));
function parseEffects(text){return Object.fromEntries(text.split('|').filter(Boolean).map(item=>{const cut=item.lastIndexOf(',');return [item.slice(0,cut),Number(item.slice(cut+1))]}));}
function choices(text){return text.split('\n').map(line=>{const [name,effects]=line.split('::');return {name,effects:parseEffects(effects||'')}})}
const layers = [
 {id:'birth',label:'Birth region',items:choices(`Mountain / high altitude::Endurance,5|Strength,3
Coastal / fishing::Dexterity,5|Luck,3
Desert / harsh climate::Endurance,5|Mental Fortitude,3|Luck,-3
Dense city::Perception,5|Cunning,3|Endurance,-3
Frontier / remote::Strength,3|Mental Fortitude,3|Charisma,-5
Conflict zone::Perception,5|Mental Fortitude,3|Empathy,-3`)},
 {id:'raised',label:'Region raised',items:choices(`Inner city::Cunning,5|Perception,3
Suburbs::Intelligence,3|Cunning,-3
Small town::Empathy,5|Perception,-3
Rural::Strength,5|Endurance,3|Charisma,-3
Immigrant enclave::Charisma,3|Empathy,3
Moved constantly::Perception,3|Charisma,3|Empathy,-5`)},
 {id:'career',label:'Career',items:choices(`None / drifter::Luck,5|Endurance,-3
Manual trade::Strength,3|Dexterity,3
Academic / professional::Intelligence,5
Sales / public-facing::Charisma,5
Care work::Empathy,3|Mental Fortitude,3
Military / police::Strength,3|Perception,3
Crime::Cunning,3|Luck,3
Artist / performer::Dexterity,3|Charisma,3`)},
 {id:'school',label:'Schooling',items:choices(`None::Cunning,5|Endurance,3|Intelligence,-5
Dropped out::Cunning,3|Intelligence,-3
Public::
Elite::Intelligence,5|Charisma,3|Endurance,-3
Military academy::Endurance,3|Mental Fortitude,3
Religious::Mental Fortitude,5|Intelligence,-3
Self-taught::Intelligence,3|Perception,3
Apprenticeship::Dexterity,5`)},
 {id:'parent1',label:'Parent / guardian 1',items:choices(`Alive, close::Luck,2
Alive, estranged::Cunning,3|Charisma,-3
Died before age 10::Mental Fortitude,3|Empathy,-3
Died in adolescence::Empathy,3|Luck,-3
Died in adulthood::Empathy,2
Unknown::Luck,-3`)},
 {id:'parent2',label:'Parent / guardian 2',items:choices(`Alive, close::Luck,2
Alive, estranged::Cunning,3|Charisma,-3
Died before age 10::Mental Fortitude,3|Empathy,-3
Died in adolescence::Empathy,3|Luck,-3
Died in adulthood::Empathy,2
Unknown::Luck,-3`)},
 {id:'siblings',label:'Sibling position',items:choices(`Only child::Intelligence,3|Charisma,-3|Empathy,-3
Eldest::Mental Fortitude,3|Empathy,3|Luck,-3
Middle::Charisma,3|Cunning,3|Perception,-3
Youngest::Charisma,5|Luck,3|Endurance,-3
Twin::Empathy,5|Perception,3
Large family (5+ children)::Endurance,3|Cunning,3|Intelligence,-3`)}
];
const trauma = choices(`Violence::Perception,3|Empathy,-4
Neglect::Cunning,3|Charisma,-4
Loss::Empathy,3|Luck,-3
Addiction::Mental Fortitude,-4
Poverty::Endurance,3|Intelligence,-3
Scandal::Cunning,3|Charisma,-4`);
const growth = {'Violence':{'Empathy':3},'Neglect':{'Charisma':3},'Loss':{'Mental Fortitude':3},'Addiction':{'Mental Fortitude':6},'Poverty':{'Cunning':3},'Scandal':{'Charisma':3}};
const beats=['Opening','Buildup','Turning point','Climax','Ending'];
const threads=['Estranged relative','Unknown parent','Unresolved hardship','A secret from the past','Someone left behind'];
const physical=[
 ['age','Age range',['Teen','20s','30s','40s','50s','60s','70+']],
 ['gender','Gender presentation',['Feminine','Masculine','Androgynous']],
 ['build','Build',['Slight','Lean','Average','Athletic','Muscular','Stocky','Heavyset']],
 ['height','Height',['Short','Below average','Average','Tall','Very tall']],
 ['skin','Skin tone',['Very fair','Fair','Light olive','Olive','Tan','Brown','Deep brown']],
 ['hair','Hair',['Short dark','Long dark','Short light','Long light','Red','Curly','Braided','Gray / silver','Shaved / bald']],
 ['eyes','Eye color',['Brown','Hazel','Green','Blue','Gray','Amber']]
];
const imageStyles={
 'Black & white ink':'black and white ink illustration, cross-hatching, high contrast, monochrome, graphic novel',
 'Fiction watercolor':'loose watercolor painting, soft washes, visible paper texture, muted palette, storybook fiction illustration',
 'Painterly illustration':'painterly digital illustration, visible brush strokes, rich color, character concept art',
 'Realistic':'photorealistic portrait photograph, natural light, 85mm lens, shallow depth of field, detailed skin texture',
 'Cinematic cover':'cinematic film still, dramatic lighting, moody color grade, anamorphic, book cover composition with space for title'
};
const ART_SERVER='http://127.0.0.1:4174';
const defaults={archetype:'Rags to riches',birth:'Dense city',raised:'Inner city',career:'Manual trade',school:'Public',parent1:'Alive, close',parent2:'Unknown',siblings:'Eldest'};
const $=id=>document.getElementById(id);
let currentCharacter;
function optionList(select,items,selected){select.replaceChildren(...items.map(item=>{let option=document.createElement('option');option.value=option.textContent=item;option.selected=item===selected;return option}));}
optionList($('archetype'),archetypes.map(x=>x.name),defaults.archetype);
optionList($('custom-stat'),stats,'Strength');
optionList($('trauma-type'),trauma.map(x=>x.name),'Loss');
for(const layer of layers){const label=document.createElement('label');label.className='layer-field';label.textContent=layer.label;const select=document.createElement('select');select.id=layer.id;optionList(select,layer.items.map(x=>x.name),defaults[layer.id]);label.append(select);$('life-layers').append(label)}
for(const [id,label,items] of physical){const field=document.createElement('label');field.className='layer-field';field.textContent=label;const select=document.createElement('select');select.id='phys-'+id;optionList(select,['Unspecified',...items],'Unspecified');field.append(select);$('physical-attributes').append(field)}
optionList($('image-style'),Object.keys(imageStyles),'Painterly illustration');
for(const thread of threads){const label=document.createElement('label');label.className='check-row';const input=document.createElement('input');input.type='checkbox';input.value=thread;label.append(input,document.createTextNode(thread));$('origin-threads').append(label)}
for(const beat of beats){const label=document.createElement('label');label.className='check-row beat-row';const input=document.createElement('input');input.type='checkbox';input.value=beat;input.checked=true;label.append(input,document.createTextNode(beat));$('story-beats').append(label)}
function addEffect(totals,detail,source,effects,scale=1,processed=false){for(const [stat,value] of Object.entries(effects)){const delta=value*scale*(processed&&value<0?.5:1);totals[stat]+=delta;detail[stat].push({source,delta})}}
function signed(n){return `${n>0?'+':''}${Number.isInteger(n)?n:n.toFixed(1)}`}
function calculate(){
 const totals=Object.fromEntries(stats.map(s=>[s,0]));const detail=Object.fromEntries(stats.map(s=>[s,[]]));const archetype=archetypes.find(x=>x.name===$('archetype').value);
 addEffect(totals,detail,archetype.name,archetype.effects);
 const selected=Object.fromEntries(layers.map(layer=>[layer.id,layer.items.find(x=>x.name===$(layer.id).value)]));
 for(const layer of layers){if(archetype.name==='Military brat'&&layer.id==='raised'&&selected.raised.name==='Moved constantly')continue;const effects=layer.id==='career'?Object.fromEntries(Object.entries(selected[layer.id].effects).map(([stat,value])=>[stat,value>0?value*Number($('career-years').value):value])):selected[layer.id].effects;addEffect(totals,detail,selected[layer.id].name,effects)}
 const severity={none:0,mild:1,severe:2,chronic:2.5}[$('trauma-severity').value];const traumaChoice=trauma.find(x=>x.name===$('trauma-type').value);const processed=$('trauma-processed').checked;
 if(severity){addEffect(totals,detail,`${traumaChoice.name} trauma`,traumaChoice.effects,severity,processed);if(processed)addEffect(totals,detail,'Processed growth',growth[traumaChoice.name]);}
 // Distinct locations imply displacement; the source describes this as a separate tag.
 const regionPairs={'Dense city':'Inner city','Frontier / remote':'Rural','Mountain / high altitude':'Rural','Coastal / fishing':'Small town','Desert / harsh climate':'Rural','Conflict zone':'Moved constantly'};
 if(regionPairs[selected.birth.name]!==selected.raised.name)addEffect(totals,detail,'Displaced',{'Perception':3,'Luck':-3});
 if(selected.parent1.name==='Alive, close'&&selected.parent2.name==='Alive, close')addEffect(totals,detail,'Close family',{'Luck':3,'Mental Fortitude':-3});
 const synergies=[];function synergy(name,effects){synergies.push(name);addEffect(totals,detail,name,effects)}
 if(archetype.name==='Orphan / foster system'&&(selected.parent1.name==='Unknown'||selected.parent2.name==='Unknown')&&selected.career.name==='Crime')synergy('Raised by the Street',{'Cunning':5});
 if(archetype.name==='Rags to riches'&&selected.school.name==='Elite')synergy('Imposter',{'Intelligence':3,'Mental Fortitude':-3});
 if(selected.siblings.name==='Eldest'&&(selected.parent1.name==='Died in adolescence'||selected.parent2.name==='Died in adolescence'))synergy('Became the Parent',{'Endurance':5,'Empathy':5,'Luck':-5});
 if(archetype.name==='War veteran'&&processed&&severity)synergy('Steady Hands',{'Dexterity':5});
 let custom=Number($('custom-percent').value);if(!Number.isFinite(custom))custom=0;custom=Math.max(-100,Math.min(100,custom));if(custom)addEffect(totals,detail,'Custom what-if',{[$('custom-stat').value]:custom});
 const results=Object.fromEntries(stats.map(s=>{const base=s===$('custom-stat').value?Number($('base-stat').value):10;return [s,{base,raw:totals[s],capped:Math.max(-35,Math.min(35,totals[s])),value:base*(1+Math.max(-35,Math.min(35,totals[s]))/100),detail:detail[s]}]}));
 currentCharacter={archetype,selected,results,synergies,custom};
 render(archetype,selected,results,synergies,custom);
}
function render(archetype,selected,results,synergies,custom){
 const name=$('character-name').value.trim()||'Unnamed character';$('tree-name').textContent=name;$('tree-archetype').textContent=archetype.name;$('preview-name').textContent=name;$('preview-archetype').textContent=archetype.name;$('archetype-summary').textContent=archetype.summary;$('preview-summary').textContent=archetype.summary;$('portrait-initials').textContent=name.split(/\s+/).slice(0,2).map(s=>s[0].toUpperCase()).join('');
 const tree=$('tree-groups');tree.replaceChildren();for(const [group,groupStats] of Object.entries(groups)){const wrap=document.createElement('section');wrap.className='tree-group';const head=document.createElement('h3');head.innerHTML=`<span class="branch-dot"></span>${group}<small>${groupStats.length} STATS</small>`;wrap.append(head);const cards=document.createElement('div');cards.className='stat-cards';for(const stat of groupStats){const r=results[stat];const card=document.createElement('article');card.className=`stat-card ${r.capped>0?'up':r.capped<0?'down':'even'} ${$('custom-stat').value===stat&&custom?'custom-active':''}`;card.tabIndex=0;card.setAttribute('aria-label',`${stat}: ${r.value.toFixed(1)}, change ${signed(r.capped)} percent`);const title=document.createElement('div');title.className='stat-title';title.innerHTML=`<span>${stat}</span><strong>${r.value.toFixed(1)}</strong>`;const bar=document.createElement('div');bar.className='stat-bar';const fill=document.createElement('span');fill.style.width=`${Math.max(8,Math.min(100,r.value/14*100))}%`;bar.append(fill);const footer=document.createElement('div');footer.className='stat-footer';const delta=document.createElement('span');delta.textContent=`${signed(r.capped)}% ${r.raw!==r.capped?'(capped)':''}`;const count=document.createElement('small');count.textContent=`${r.detail.length} effects`;footer.append(delta,count);const tip=document.createElement('div');tip.className='stat-tip';tip.textContent=r.detail.length?r.detail.map(x=>`${x.source} ${signed(x.delta)}%`).join(' · '):'No modifiers';card.append(title,bar,footer,tip);cards.append(card)}wrap.append(cards);tree.append(wrap)}
 const target=$('custom-stat').value;const r=results[target];$('base-value').textContent=r.base;$('sim-result').textContent=`${target}: base ${r.base} × (1 ${r.capped<0?'−':'+'} ${Math.abs(r.capped)}%) = ${r.value.toFixed(1)} · entered ${signed(custom)}% · total before cap ${signed(r.raw)}%`;
 const profile=$('origin-profile');profile.replaceChildren();const profileRows=[['Born',selected.birth.name],['Raised',selected.raised.name],['Career',selected.career.name],['Schooling',selected.school.name],['Family',`${selected.parent1.name} / ${selected.parent2.name}`],['Siblings',selected.siblings.name]];if($('appearance').value.trim())profileRows.push(['Appearance',$('appearance').value.trim()]);for(const [label,value] of profileRows){const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;profile.append(dt,dd)}
 const top=[...stats].sort((a,b)=>results[b].value-results[a].value).slice(0,3);$('top-traits').replaceChildren(...top.map((stat,i)=>{const div=document.createElement('div');div.innerHTML=`<span class="trait-rank">0${i+1}</span><span>${stat}</span><strong>${results[stat].value.toFixed(1)}</strong>`;return div}));
 const activeThreads=[...document.querySelectorAll('#origin-threads input:checked')].map(x=>x.value);const traumaPhrase=$('trauma-severity').value==='none'?'':` They carry ${$('trauma-severity').value} ${$('trauma-type').value.toLowerCase()}${$('trauma-processed').checked?', with some growth from processing it':''}.`;
 $('story-seed').textContent=`${name} is ${archetype.name.toLowerCase()}, raised in ${selected.raised.name.toLowerCase()} and shaped by ${selected.career.name.toLowerCase()}.${traumaPhrase}${activeThreads.length?` Open threads: ${activeThreads.join(', ')}.`:''}${synergies.length?` Tags: ${synergies.join(', ')}.`:''}`;
 $('tension-value').textContent=$('tension').value;const activeBeats=[...document.querySelectorAll('#story-beats input:checked')].map(x=>x.value);const beat=$('beat-preview');beat.replaceChildren();const intro=document.createElement('p');intro.textContent=`${$('story-format').value} · ${$('story-genre').value.trim()||'Genre unspecified'} · Tension ${$('tension').value}/100`;const premise=document.createElement('p');premise.textContent=$('story-premise').value.trim()||'Add a premise to preview this story.';const setting=document.createElement('p');setting.textContent=$('story-setting').value.trim()?`Setting: ${$('story-setting').value.trim()}`:'';const list=document.createElement('div');list.className='beat-chips';for(const b of activeBeats){const chip=document.createElement('span');chip.textContent=b;list.append(chip)}beat.append(intro,premise,setting,list);
}
function characterCardText(){
 const {archetype,selected,results,synergies,custom}=currentCharacter;
 const name=$('character-name').value.trim()||'Unnamed character';
 const threads=[...document.querySelectorAll('#origin-threads input:checked')].map(input=>input.value);
 const traumaSeverity=$('trauma-severity').value;
 const traumaText=traumaSeverity==='none'?'None':`${$('trauma-type').value} (${traumaSeverity}${$('trauma-processed').checked?', processed':''})`;
 return [
  'CHARACTER CARD',`Name: ${name}`,`Background archetype: ${archetype.name}`,`Background summary: ${archetype.summary}`,
  `Appearance / visual cues: ${$('appearance').value.trim()||'Not specified'}`,'',
  'PHYSICAL',...physical.map(([id,label])=>`${label}: ${$('phys-'+id).value}`),`Distinguishing marks: ${$('distinguishing').value.trim()||'None'}`,'',
  'ORIGIN',`Birth region: ${selected.birth.name}`,`Region raised: ${selected.raised.name}`,`Career: ${selected.career.name} (${ $('career-years').selectedOptions[0].textContent })`,
  `Schooling: ${selected.school.name}`,`Parent / guardian 1: ${selected.parent1.name}`,`Parent / guardian 2: ${selected.parent2.name}`,`Sibling position: ${selected.siblings.name}`,
  `Trauma: ${traumaText}`,`Open threads: ${threads.join(', ')||'None selected'}`,`Synergy tags: ${synergies.join(', ')||'None'}`,'',
  'STATS',...stats.map(stat=>{const r=results[stat];return `${stat}: ${r.value.toFixed(1)} (base ${r.base}; ${signed(r.capped)}%${r.raw!==r.capped?`; ${signed(r.raw)}% before cap`:''})`}),
  `What-if modifier: ${$('custom-stat').value} ${signed(custom)}%`,'Rule: all percentage changes add, then the total is capped at ±35% per stat.','',
  'STORY SEED',$('story-seed').textContent
 ].join('\n');
}
function storyDataText(){
 const beatsSelected=[...document.querySelectorAll('#story-beats input:checked')].map(input=>input.value);
 return ['STORY DATA',`Format: ${$('story-format').value}`,`Genre: ${$('story-genre').value.trim()||'Not specified'}`,`Premise: ${$('story-premise').value.trim()||'Not specified'}`,`Setting / visual world: ${$('story-setting').value.trim()||'Not specified'}`,`Book image direction: ${$('cover-direction').value.trim()||'Not specified'}`,`Opening tension: ${$('tension').value}/100`,`Story beats: ${beatsSelected.join(' → ')||'None selected'}`].join('\n');
}
async function copyText(text,statusId){
 const status=$(statusId);
 try{
  let copied=false;
  if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);copied=true}catch{}}
  if(!copied){const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();try{copied=document.execCommand('copy')}finally{field.remove()}}
  if(!copied)throw new Error('Copy unavailable');
  status.textContent='Copied to clipboard';
 }catch{status.textContent='Copy failed. Check clipboard permission and retry.'}
}
$('copy-character').addEventListener('click',()=>copyText(characterCardText(),'character-copy-status'));
$('generate-image').addEventListener('click',async()=>{
 const button=$('generate-image'),status=$('image-status');button.disabled=true;status.textContent='Writing prompt and rendering… this can take a few minutes';
 try{
  const res=await fetch(`${ART_SERVER}/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({card:characterCardText(),story:storyDataText(),style:imageStyles[$('image-style').value],shot:$('image-shot').value})});
  const body=await res.json();if(!res.ok)throw new Error(body.error||`HTTP ${res.status}`);
  $('image-output').src=`${ART_SERVER}${body.url}`;$('image-prompt').textContent=body.prompt;$('image-result').hidden=false;status.textContent=`Saved ${body.file}`;
 }catch(err){status.textContent=`Failed: ${err.message}. Is the art server running? See docs/image-generation.md`}
 finally{button.disabled=false}
});
$('copy-story').addEventListener('click',()=>copyText(storyDataText(),'story-copy-status'));
document.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('input',()=>{calculate();$('character-copy-status').textContent='';$('story-copy-status').textContent=''}));
$('reset-button').addEventListener('click',()=>{location.reload()});
calculate();
