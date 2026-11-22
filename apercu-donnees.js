'use strict';
// Données de présentation locales pour modifier le design sans lancer OCTOBRE.
sessionStorage.setItem('octobre-session', 'apercu-design');
localStorage.setItem('octobre-conversation', 'demo');
(() => {
  const conversations = [{id:'demo', title:'Mon espace de création'}];
  const history = new Map([['demo', []]]);
  const tasks = [];
  const voices = ['voice_female','voice_male'].map((id,index)=>({
    id, label:index?'Voix masculine':'Voix féminine', source:'Référence de présentation',
    reference_text:'Bonjour, je suis Octobre. Que faisons-nous aujourd’hui ?',
    status:'conditioned',has_conditioning:true,voice_approved:true,ready:true
  }));
  let activeVoice = 'voice_female';
  let gaming = false, compatible = true;
  const models = ['Dialogue','Raisonnement','Développement','Secours','Mémoire','Transcription','Voix de secours','Synthèse','Création','Retouche','Vidéo'];
  const roles = ['chat','reason','code','fallback','embedding','stt','kokoro','tts','image','edit','video'];
  const json = (value,status=200) => new Response(JSON.stringify(value), {status,headers:{'Content-Type':'application/json'}});
  function events() {
    const frames = [
      ['state',{state:'queued'}],['state',{state:'running'}],
      ['tool',{tool:'file.read',result:{status:'succeeded'}}],
      ['token',{text:'Voici un exemple de réponse pour travailler la mise en page. '}],
      ['token',{text:'Tu peux modifier les couleurs, les boutons, les espacements et la sphère dans les fichiers du dossier interface.'}],
      ['state',{state:'succeeded'}]
    ];
    let index=0, timer;
    return new Response(new ReadableStream({
      start(controller) {
        function next() {
          if(index===frames.length){controller.close();return;}
          const [kind,payload]=frames[index++];
          controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({kind,payload:JSON.stringify(payload)})+String.fromCharCode(10,10)));
          timer=setTimeout(next,450);
        }
        next();
      },
      cancel(){clearTimeout(timer);}
    }), {headers:{'Content-Type':'text/event-stream'}});
  }
  window.fetch = async (input,options={}) => {
    const url = String(input instanceof Request ? input.url : input);
    if(!url.includes('/api/')) return json({detail:'Écran de présentation uniquement.'},409);
    const path = url.split('/api/')[1].split('?')[0];
    const method=options.method||'GET';
    let body={};
    if(typeof options.body==='string'){try{body=JSON.parse(options.body);}catch{}}
    if(path==='health') return json({ready:true,application:'OCTOBRE · aperçu'});
    if(path==='conversations') {
      if(method==='POST'){
        const item={id:'demo-'+Date.now(),title:'Nouvelle discussion'};
        conversations.unshift(item);history.set(item.id,[]);return json(item);
      }
      return json(conversations);
    }
    if(path.endsWith('/messages'))return json(history.get(path.split('/')[1])||[]);
    if(path==='chat'){
      const id='task-'+Date.now(),created=new Date().toISOString();
      tasks.unshift({id,text:body.text,state:'succeeded',created,result:'Exemple de réponse du mode design.'});
      const list=history.get(body.conversation)||[];
      list.push({role:'user',content:body.text},{role:'assistant',content:'Exemple de réponse du mode design.',artifacts:[]});
      history.set(body.conversation,list);
      return json({task:id});
    }
    if(path.endsWith('/events'))return events();
    if(path==='tasks')return json(tasks);
    if(path==='workflows/runs')return json([]);
    if(path==='voices')return json({active:activeVoice,profiles:voices});
    if(path==='voices/select'){activeVoice=body.profile;return json({active:activeVoice});}
    if(path==='voices/preview'||path==='stt')return json({detail:'Aperçu graphique. La synthèse et la transcription nécessitent le moteur OCTOBRE.'},409);
    if(path==='models')return json(models.map((model,i)=>({role:roles[i],model,state:'installed',verified:true})));
    if(path==='doctor')return json({
      gpu_profile:gaming?'gaming':'normal',image_compatibility:compatible,
      file_policy:{verified_roots:['Mon espace de travail']},
      resources:{gpu:{used_mb:1024},ram:{available_mb:24000},disk_free_gb:400},
      models:models.map((model,i)=>({role:roles[i],model,state:'installed',probe:{passed:true}})),
      mode:'Données fictives pour le design'
    });
    if(path==='gaming'){gaming=body.enabled;return json({enabled:gaming});}
    if(path==='image/compatibility'){compatible=body.enabled;return json({enabled:compatible});}
    if(path==='tools')return json({items:[{path:'Projets',directory:true},{path:'notes.txt',directory:false}]});
    if(path==='actions')return json([{id:'exemple',kind:'Modification',original:'notes.txt',state:'recoverable'}]);
    if(path==='memory/index')return json({indexed:3});
    if(path==='memory/search')return json({hits:[{path:'notes.txt',excerpt:'Un exemple de résultat de recherche.',stale:false}]});
    if(path==='workflows')return json([{
      id:'exemple',name:'Préparer mon espace',enabled:false,
      definition:JSON.stringify({steps:[{id:'liste',tool:'file.list',arguments:{}}],parameters:{}})
    }]);
    if(path==='connectors')return json([{id:'exemple',name:'Connecteur de présentation',enabled:false}]);
    if(path==='remote')return json({enabled:false,devices:[]});
    if(path==='remote/enabled'||path==='remote/code')return json({detail:'L’appairage est disponible dans l’application OCTOBRE.'},409);
    if(path==='tts/cancel')return json({});
    return json({detail:'Cette commande est présentée dans le mode design. Aucune opération exécutée.'},409);
  };
})();
