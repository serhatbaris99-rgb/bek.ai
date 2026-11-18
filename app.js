const $=id=>document.getElementById(id);
let chatHistory=[],lastCode='',lastWebsite='',lastApp='',activeChatId=null,supabaseClient=null,currentUser=null;\nconst publicConfig=window.BEKAI_CONFIG||{};\nif(window.supabase?.createClient && publicConfig.SUPABASE_URL?.startsWith('https://') && publicConfig.SUPABASE_ANON_KEY && !publicConfig.SUPABASE_ANON_KEY.startsWith('PASTE_')){supabaseClient=window.supabase.createClient(publicConfig.SUPABASE_URL,publicConfig.SUPABASE_ANON_KEY);}
const titles={chat:['Yapay zekâ sohbeti','Fikirlerini konuş, öğren ve üret.'],image:['Görsel stüdyosu','Metinden görsel oluştur.'],code:['Kod asistanı','Kod yaz, açıkla ve hata ayıkla.'],website:['Website oluştur','Fikrini çalışan bir web sayfasına dönüştür.'],app:['Uygulama oluştur','Projenin planını ve başlangıç kodunu hazırla.']};
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2800)}
function setView(name){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+name));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('pageTitle').textContent=titles[name][0];$('pageSubtitle').textContent=titles[name][1];$('sidebar').classList.remove('open')}
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('mobileMenu').onclick=()=>$('sidebar').classList.toggle('open');
async function askAI(messages,system='Sen BEK AI adlı yardımcı, dikkatli ve yetkin bir yapay zekâsın. Türkçe yanıt ver. Bilmediğin şeyi uydurma.'){
 if(!supabaseClient)throw new Error('Supabase ayarı eksik. config.js dosyasına proje URL ve anon public key girilmeli.');
 const {data:{session}}=await supabaseClient.auth.getSession();
 if(!session)throw new Error('AI kullanmak için önce Hesabım / Giriş bölümünden e-posta ile giriş yap.');
 const response=await fetch(publicConfig.SUPABASE_URL+'/functions/v1/ai-chat',{method:'POST',headers:{'Content-Type':'application/json','apikey':publicConfig.SUPABASE_ANON_KEY,'Authorization':'Bearer '+session.access_token},body:JSON.stringify({messages:[{role:'system',content:system},...messages]})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||'AI sunucusundan yanıt alınamadı.');
 return data.answer;
}
async function saveChatMessage(role,content){
 if(!supabaseClient||!currentUser)return;
 if(!activeChatId){const title=(chatHistory.find(m=>m.role==='user')?.content||'Yeni sohbet').slice(0,70);const {data,error}=await supabaseClient.from('bekai_chats').insert({user_id:currentUser.id,title}).select('id').single();if(error)throw error;activeChatId=data.id;}
 const {error}=await supabaseClient.from('bekai_messages').insert({chat_id:activeChatId,user_id:currentUser.id,role,content});
 if(error)throw error;
 await supabaseClient.from('bekai_chats').update({updated_at:new Date().toISOString()}).eq('id',activeChatId);
}
async function saveProject(name,kind,files){
 if(!supabaseClient||!currentUser)return;
 const {error}=await supabaseClient.from('bekai_projects').insert({user_id:currentUser.id,name,kind,files});
 if(error)toast('Proje bu cihazda hazır; buluta kaydedilemedi: '+error.message);
 else toast('Proje hesabına kaydedildi.');
}
async function loadSavedChats(){if(!supabaseClient||!currentUser)return;const {data,error}=await supabaseClient.from('bekai_chats').select('id,title,updated_at').order('updated_at',{ascending:false}).limit(15);if(error)return;let box=$('historyList');if(!box)return;box.replaceChildren();data.forEach(chat=>{const b=document.createElement('button');b.className='history-item';b.textContent=chat.title;b.onclick=()=>openSavedChat(chat.id);box.append(b)});}\nasync function openSavedChat(id){if(!supabaseClient||!currentUser)return;const {data,error}=await supabaseClient.from('bekai_messages').select('role,content').eq('chat_id',id).order('created_at',{ascending:true}).limit(100);if(error)return toast('Sohbet yüklenemedi: '+error.message);activeChatId=id;chatHistory=data||[];$('messages').replaceChildren();$('welcome').style.display=chatHistory.length?'none':'block';chatHistory.forEach(m=>addMessage(m.role,m.content));setView('chat');}\nasync function initAuth(){
 if(!supabaseClient){$('connectBtn').textContent='Supabase ayarı gerekli';return;}
 const {data}=await supabaseClient.auth.getSession();currentUser=data.session?.user||null;updateAuthButton();if(currentUser)loadSavedChats();
 supabaseClient.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;updateAuthButton();if(currentUser)loadSavedChats();});
}
function updateAuthButton(){$('connectBtn').textContent=currentUser?(currentUser.email||'Hesabım')+' · Çıkış':'E-posta ile giriş';}

function addMessage(role,text){$('welcome').style.display='none';const row=document.createElement('div');row.className='message '+role;const avatar=document.createElement('div');avatar.className='avatar';avatar.textContent=role==='user'?'S':'✦';const body=document.createElement('div');body.className='message-body';body.textContent=text;row.append(avatar,body);$('messages').append(row);row.scrollIntoView({block:'end',behavior:'smooth'})}
function renderHistory(){if(!chatHistory.length)return;$('welcome').style.display='none';chatHistory.forEach(m=>addMessage(m.role,m.content))}
async function sendChat(){const input=$('chatInput'),prompt=input.value.trim();if(!prompt)return;input.value='';chatHistory.push({role:'user',content:prompt});addMessage('user',prompt);$('sendChat').disabled=true;try{await saveChatMessage('user',prompt);const answer=await askAI(chatHistory.slice(-12));chatHistory.push({role:'assistant',content:answer});addMessage('assistant',answer);await saveChatMessage('assistant',answer)}catch(e){addMessage('assistant','İşlem tamamlanamadı: '+e.message)}finally{$('sendChat').disabled=false}}
