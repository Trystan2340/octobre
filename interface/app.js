'use strict';
let token = location.hash.slice(1) || sessionStorage.getItem('octobre-session');
if (token) sessionStorage.setItem('octobre-session', token);
history.replaceState(null, '', location.pathname);
if(!token&&location.protocol==='https:')location.replace('/pair');
let conversation = localStorage.getItem('octobre-conversation');
let currentTask = null;
let lastAnswer = '';
let voiceState = null;
let imageAttachments=[];
let recorder=null;
let recordingStream=null;
let cancelSpeech=false;
let isSpeaking=false;
const $ = id => document.getElementById(id);
const labels = {queued:'En attente',waiting_gpu:'Attend le moteur',running:'Travaille',verifying:'Vérifie',succeeded:'Terminée',failed:'Erreur',cancelled:'Interrompue',interrupted:'Interrompue par un arrêt',not_installed:'À installer',installed:'Installé',loaded:'Chargé',downloading:'Téléchargement',error:'Erreur'};
const roles = {chat:'Dialogue',reason:'Raisonnement',code:'Développement',fallback:'Dialogue de secours',embedding:'Mémoire sémantique',stt:'Transcription',kokoro:'Voix de secours',tts:'Deux voix clonées',image:'Création d’images',edit:'Édition d’images',video:'Vidéo'};
function element(tag, text, cls) { const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el; }
function notice(text) { $('notice').textContent=text;$('notice').classList.toggle('hidden',!text); }
async function api(path, body, method) {
  const response = await fetch('/api/'+path,{method:method||(body===undefined?'GET':'POST'),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok){let data;try{data=await response.json();}catch{data={detail:'Erreur '+response.status};}throw new Error(data.detail||'Action indisponible');}
  return response.json();
}
function guarded(action){return async(...args)=>{try{notice('');await action(...args);}catch(error){notice(error.message);$('status').textContent='À vérifier';}};}
function message(role,text){const box=element('div',text,'message '+role);$('messages').append(box);$('messages').scrollTop=$('messages').scrollHeight;return box;}
async function loadConversations() {
  const list = await api('conversations');
  if (!conversation || !list.some(item => item.id === conversation)) {
    conversation = list[0]?.id || (await api('conversations', {})).id;
    localStorage.setItem('octobre-conversation', conversation);
  }
  const historyButtons = list.map(item => {
    const button = element('button', item.title);
    button.setAttribute('aria-current', String(item.id === conversation));
    button.disabled = $('send').disabled;
    button.onclick = guarded(async () => {
      if ($('send').disabled) return;
      conversation = item.id;
      localStorage.setItem('octobre-conversation', conversation);
      await loadMessages();
      await loadConversations();
      showPage('chat');
    });
    return button;
  });
  $('conversations').replaceChildren(...historyButtons);
}

function showWelcome() {
  $('messages').replaceChildren($('welcome-template').content.cloneNode(true));
}

async function loadMessages() {
  const target = conversation;
  const list = await api('conversations/' + target + '/messages');
  if (conversation !== target) return;
  lastAnswer = '';
  if (!list.length) {
    showWelcome();
    return;
  }
  $('messages').replaceChildren();
  for (const item of list) {
    const box = message(item.role, item.content);
    if (item.role === 'assistant') {
      lastAnswer = item.content;
      for (const artifact of item.artifacts || []) await showArtifact(artifact, box);
    }
  }
}

async function newChat() {
  if ($('send').disabled) return;
  conversation = (await api('conversations', {})).id;
  localStorage.setItem('octobre-conversation', conversation);
  lastAnswer = '';
  showWelcome();
  await loadConversations();
  showPage('chat');
  $('message-input').focus();
}

function setSending(active) {
  $('send').disabled = active;
  $('new-chat').disabled = active;
  $('conversations').querySelectorAll('button').forEach(button => { button.disabled = active; });
}

async function followTask(task, handleEvent) {
  const response = await fetch('/api/tasks/' + task + '/events', { headers: { Authorization: 'Bearer ' + token } });
  if (!response.ok || !response.body) throw new Error('Flux de réponse indisponible');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (!frame.startsWith('data: ')) continue;
        const event = JSON.parse(frame.slice(6));
        handleEvent(event.kind, JSON.parse(event.payload));
      }
    }
  } finally {
    // Parsing or rendering errors must not leave a live reader attached.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function send() {
  const text = $('message-input').value.trim();
  if (!text || $('send').disabled || !conversation) return;
  notice('');
  $('messages').querySelector('.welcome')?.remove();
  message('user', text);
  $('message-input').value = '';
  setSending(true);
  $('stop').classList.remove('hidden');
  $('stop').disabled = true;

  const box = message('assistant', undefined);
  box.classList.add('answer-row');
  const activity = window.octobreIdentity.startActivity();
  const output = element('div', '', 'message-body');
  output.setAttribute('aria-live', 'off');
  box.append(activity.element, output);
  $('messages').scrollTop = $('messages').scrollHeight;
  const artifacts = [];
  let finalState = null;
  try {
    const result = await api('chat', {
      text, conversation, mode: $('mode').value,
      idempotency: crypto.randomUUID(), image_ids: imageAttachments
    });
    currentTask = result.task;
    $('stop').disabled = false;
    imageAttachments = [];
    $('attachment-status').textContent = '';
    await followTask(currentTask, (kind, payload) => {
      activity.receive(kind, payload);
      if (kind === 'token') {
        const messages = $('messages');
        const shouldScroll = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 90;
        output.textContent += payload.text;
        output.setAttribute('aria-busy', 'true');
        if (shouldScroll) messages.scrollTop = messages.scrollHeight;
      } else if (kind === 'state') {
        const state = payload.state;
        $('status').textContent = labels[state] || state;
        if (['succeeded', 'failed', 'cancelled', 'interrupted'].includes(state)) finalState = state;
        if (payload.error) {
          notice(payload.error);
          box.classList.add('error');
          if (!output.textContent) output.textContent = payload.error;
        }
      } else if (kind === 'artifact') {
        artifacts.push(payload);
      }
    });

    if (!finalState) throw new Error('Le flux s’est arrêté. Retrouvez l’état réel de la demande dans Missions.');
    lastAnswer = finalState === 'succeeded' ? output.textContent : lastAnswer;
    for (const artifact of artifacts) await showArtifact(artifact, box);
    await loadConversations();
    if (finalState === 'succeeded' && lastAnswer && $('auto-speech').checked) {
      readSentences(lastAnswer).catch(error => notice(error.message));
    }
  } finally {
    activity.finish();
    output.removeAttribute('aria-busy');
    currentTask = null;
    setSending(false);
    $('stop').disabled = false;
    if (!isSpeaking) $('stop').classList.add('hidden');
  }
}
async function play(profile,text){$('status').textContent='Prépare la voix…';const result=await api('voices/preview',{profile,text});const response=await fetch('/api/audio/'+result.audio_id,{headers:{Authorization:'Bearer '+token}});if(!response.ok)throw new Error('Audio non disponible');if(result.fallback||result.is_clone===false)notice('Voix féminine de secours : le timbre diffère du clone sélectionné.');const blob=await response.blob();const player=$('audio');player.classList.remove('hidden');player.pause();if(player.src.startsWith('blob:'))URL.revokeObjectURL(player.src);player.src=URL.createObjectURL(blob);const pref=JSON.parse(localStorage.getItem('octobre-playback-'+profile)||'{}');player.playbackRate=pref.rate||1;player.volume=pref.volume??1;await player.play();$('status').textContent='Lecture';await loadVoices();}
async function loadVoices(){voiceState=await api('voices');$('voice-select').value=voiceState.active;$('voices-list').replaceChildren();for(const profile of voiceState.profiles){const card=element('div',undefined,'card voice-card');card.append(element('h3',profile.label));card.append(element('span',profile.voice_approved?'Validée par écoute':profile.has_conditioning?'Aperçu créé · à valider':profile.status==='transcribed'?'Transcription prête':'En attente','badge'));card.append(element('p',profile.source||'Aucun extrait importé','meta'));const text=element('textarea');text.value=profile.reference_text||'';text.setAttribute('aria-label','Transcription '+profile.label);card.append(text);const saved=element('button','Confirmer la transcription');saved.onclick=guarded(async()=>{await api('voices/update',{profile:profile.id,text:text.value,transcript_confirmed:true,voice_approved:false});notice('Transcription conservée sur ce PC. Écoutez maintenant un aperçu.');});const preview=element('button','Écouter un aperçu');preview.disabled=!profile.reference_text;preview.onclick=guarded(()=>play(profile.id,$('test-phrase').value));const approve=element('button','Valider cette voix');approve.disabled=!profile.has_conditioning;approve.onclick=guarded(async()=>{await api('voices/update',{profile:profile.id,text:text.value,transcript_confirmed:true,voice_approved:true});await loadVoices();});const select=element('button','Utiliser cette voix');select.disabled=!profile.ready;select.onclick=guarded(async()=>{await api('voices/select',{profile:profile.id});await loadVoices();});card.append(saved,preview,approve,select);addVoiceLifecycle(card,profile,text);$('voices-list').append(card);}}
async function loadMissions(){const list=await api('tasks');const runs=await api('workflows/runs');$('missions-list').replaceChildren();for(const task of list){const card=element('div',undefined,'card');card.append(element('p',task.text),element('p',(labels[task.state]||task.state)+' · '+new Date(task.created).toLocaleString('fr-FR'),'meta'));if(task.error)card.append(element('p',task.error));const run=runs.find(x=>x.id===task.id);if(run&&['running','paused','interrupted','failed'].includes(run.state)){const action=run.state==='running'?'pause':'resume';const control=element('button',action==='pause'?'Mettre en pause':'Reprendre');control.onclick=guarded(async()=>{await api('workflows/runs/'+task.id+'/'+action,{});await loadMissions();});card.append(control);}if(['queued','running','waiting_gpu'].includes(task.state)){const stop=element('button','Interrompre');stop.onclick=guarded(async()=>{await api(`tasks/${task.id}/cancel`,{});await loadMissions();});card.append(stop);}const detail=element('details');detail.append(element('summary','Résultat et détails'));detail.append(element('pre',task.result||task.error||'En cours'));card.append(detail);$('missions-list').append(card);}if(!list.length)$('missions-list').append(element('p','Aucune mission pour le moment.','muted'));}
async function loadProjects(){const doctor=await api('doctor');$('workspace-path').textContent=doctor.file_policy.verified_roots.join('\n');const result=await api('tools',{name:'file.list',arguments:{}});$('files-list').replaceChildren();for(const item of result.items)$('files-list').append(element('div',(item.directory?'▧ ':'▤ ')+item.path,'result-row'));const actions=await api('actions');$('actions-list').replaceChildren();for(const action of actions){const row=element('div',`${action.kind} · ${action.original} · ${action.state}`,'result-row');if(action.state==='recoverable'){const restore=element('button','Restaurer');restore.onclick=guarded(async()=>{if(action.kind==='voice_profile')await api('voices/archive/'+action.id+'/restore',{});else await api('tools',{name:'file.restore',arguments:{action_id:action.id}});await loadProjects();});row.append(restore);}$('actions-list').append(row);}}
async function loadHealth(){const report=await api('doctor');$('health-report').textContent=JSON.stringify(report,null,2);$('gaming').checked=report.gpu_profile==='gaming';$('image-compatibility').checked=report.image_compatibility;$('resource-cards').replaceChildren();for(const [title,value] of [['Mémoire graphique utilisée',(report.resources.gpu.used_mb||'—')+' Mo'],['RAM disponible',report.resources.ram.available_mb+' Mo'],['Espace disque libre',report.resources.disk_free_gb+' Go']]){const card=element('div',undefined,'card');card.append(element('p',title,'meta'),element('p',value));$('resource-cards').append(card);}$('model-rows').replaceChildren();for(const model of report.models){const row=element('tr');for(const value of [roles[model.role],model.model,labels[model.state]||model.state,model.probe?.passed?'Test d’inférence réussi':model.verified?'Fichiers vérifiés · inférence à tester':'À vérifier'])row.append(element('td',value));$('model-rows').append(row);}}
const pageNames = {
  chat: 'Discussion', missions: 'Missions', projects: 'Projets et fichiers',
  voices: 'Studio vocal', tools: 'Outils', health: 'Diagnostic', settings: 'Paramètres'
};

function showPage(name, focus = false) {
  if (!pageNames[name]) return;
  for (const page of document.querySelectorAll('.page')) page.classList.toggle('hidden', page.id !== 'page-' + name);
  for (const button of document.querySelectorAll('nav button')) {
    const active = button.dataset.page === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  $('page-title').textContent = pageNames[name];
  if (focus) $('page-title').focus();
  const loader = { missions: loadMissions, projects: loadProjects, voices: loadVoices,
    health: loadHealth, tools: loadTools, settings: loadPlayback }[name];
  if (loader) guarded(loader)();
}

document.querySelectorAll('[data-page]').forEach(button => {
  button.onclick = () => showPage(button.dataset.page, true);
});
$('messages').addEventListener('click', guarded(async event => {
  const suggestion = event.target.closest('[data-prompt]');
  if (!suggestion || $('send').disabled) return;
  $('message-input').value = suggestion.dataset.prompt;
  await send();
}));
showWelcome();
$('send').onclick=guarded(send);$('message-input').onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();guarded(send)();}};
$('new-chat').onclick=guarded(newChat);$('stop').onclick=guarded(async()=>{if(currentTask)await api(`tasks/${currentTask}/cancel`,{});$('audio').pause();cancelSpeech=true;await api('tts/cancel',{});});
$('voice-select').onchange=guarded(async()=>{try{await api('voices/select',{profile:$('voice-select').value});}finally{await loadVoices();}});
$('read-answer').onclick=guarded(async()=>{if(!lastAnswer)throw new Error('Aucune réponse à relire pour le moment.');showPage('voices');await play($('voice-select').value,lastAnswer.slice(0,1200));});
$('refresh-health').onclick=guarded(loadHealth);$('gaming').onchange=guarded(async()=>{await api('gaming',{enabled:$('gaming').checked});await loadHealth();});
$('list-files').onclick=guarded(loadProjects);$('index-files').onclick=guarded(async()=>{const result=await api('memory/index',{path:'.'});notice(`${result.indexed} fichiers texte indexés. Recherche lexicale disponible.`);});
$('search-files').onclick=guarded(async()=>{const data=await api('memory/search?q='+encodeURIComponent($('search-query').value));const results=Array.isArray(data)?data:data.hits;$('search-results').replaceChildren();for(const result of results){const card=element('div',undefined,'card');card.append(element('p',result.path,'path'),element('p',result.excerpt),element('p',result.stale?'Source modifiée : réindexation nécessaire':'Source vérifiée','meta'));$('search-results').append(card);}});
$('audio').onended=()=>{$('status').textContent='Prêt';};
guarded(async()=>{await api('health');await loadConversations();await loadMessages();await loadVoices();$('status').textContent='Prêt';})();

$('image-compatibility').onchange=guarded(async()=>{await api('image/compatibility',{enabled:$('image-compatibility').checked});});
$('attach-image').onclick=()=>$('image-file').click();
$('image-file').onchange=guarded(async()=>{const file=$('image-file').files[0];if(!file)return;const response=await fetch('/api/attachments/image',{method:'POST',headers:{Authorization:'Bearer '+token},body:file});const data=await response.json();if(!response.ok)throw new Error(data.detail);imageAttachments.push(data.image_id);$('attachment-status').textContent=imageAttachments.length+' image(s) jointe(s)';});
$('capture-screen').onclick=guarded(async()=>{const data=await api('screen',{});imageAttachments.push(data.image_id);$('attachment-status').textContent=imageAttachments.length+' capture(s) ou image(s) jointe(s)';notice('Capture ponctuelle jointe. Ajoutez votre demande puis envoyez. Aucun partage continu.');});
function microphoneLabel(action){const labels={idle:['icon-mic','Dicter'],recording:['icon-record','Terminer'],transcribing:['icon-spinner','Transcription']};const [glyph,text]=labels[action]||labels.idle;const button=$('microphone');const icon=element('span','','btn-icon '+glyph);icon.setAttribute('aria-hidden','true');button.dataset.action=action;button.disabled=action==='transcribing';button.replaceChildren(icon,document.createTextNode(text));}
$('microphone').onclick=guarded(async()=>{
 if(recorder&&recorder.state==='recording'){microphoneLabel('transcribing');recorder.stop();return;}
 $('audio').pause();cancelSpeech=true;
 recordingStream=await navigator.mediaDevices.getUserMedia({audio:true});
 const parts=[];recorder=new MediaRecorder(recordingStream,{mimeType:'audio/webm;codecs=opus'});const currentRecorder=recorder;const currentStream=recordingStream;
 recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
 recorder.onstop=guarded(async()=>{window.octobreIdentity.listen(false);microphoneLabel('transcribing');currentStream.getTracks().forEach(track=>track.stop());try{const response=await fetch('/api/stt',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'audio/webm'},body:new Blob(parts,{type:'audio/webm'})});const data=await response.json();if(!response.ok)throw new Error(data.detail);$('message-input').value=data.text;notice('Transcription locale prête : vous pouvez la corriger avant envoi.');}finally{microphoneLabel('idle');}});
 recorder.start();window.octobreIdentity.listen(true);microphoneLabel('recording');notice('Microphone actif sur ce PC. Cliquez sur Terminer pour transcrire.');setTimeout(()=>{if(currentRecorder.state==='recording')currentRecorder.stop();},60000);
});
async function readSentences(text){cancelSpeech=false;isSpeaking=true;$('stop').classList.remove('hidden');try{const sentences=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[text];for(const sentence of sentences){if(cancelSpeech)break;await play($('voice-select').value,sentence.slice(0,1200));await new Promise(resolve=>{const audio=$('audio');audio.addEventListener('ended',resolve,{once:true});audio.addEventListener('pause',resolve,{once:true});});}}finally{isSpeaking=false;if(!currentTask)$('stop').classList.add('hidden');}}
