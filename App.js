import React, { useState, useEffect, useRef, useContext, createContext, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import {
  Animated, Share, Switch, Vibration, Platform, Linking,
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, TextInput, Modal, Alert, Image,
} from 'react-native';

const { width } = Dimensions.get('window');

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
} catch (_) {}

// ─── THEMES ──────────────────────────────────────────────────────────────────
const DARK = {
  bg:'#07090F', card:'#10141E', card2:'#181E2C', border:'#28344A',
  accent:'#00E5A0', accentD:'#00B880', orange:'#FF6B35', blue:'#4A9EFF',
  purple:'#A855F7', text:'#EEF2FF', muted:'#8A9BBF', danger:'#FF4757',
};
const LIGHT = {
  bg:'#EEF2FA', card:'#FFFFFF', card2:'#E0E8F5', border:'#C0CEEA',
  accent:'#00A86B', accentD:'#008F5A', orange:'#D95010', blue:'#1E68CC',
  purple:'#7020C0', text:'#08101E', muted:'#5A6888', danger:'#CC2230',
};

// ─── ACCENT COLOR OPTIONS ─────────────────────────────────────────────────────
const ACCENT_OPTIONS = [
  { key:'green',  label:'Verde',   darkA:'#00E5A0', darkD:'#00B880', lightA:'#00A86B', lightD:'#008F5A' },
  { key:'blue',   label:'Azul',    darkA:'#4A9EFF', darkD:'#2E7EE0', lightA:'#1E68CC', lightD:'#0050A0' },
  { key:'purple', label:'Roxo',    darkA:'#A855F7', darkD:'#8030D0', lightA:'#7020C0', lightD:'#5010A0' },
  { key:'orange', label:'Laranja', darkA:'#FF6B35', darkD:'#E05020', lightA:'#D95010', lightD:'#B03000' },
  { key:'rose',   label:'Rosa',    darkA:'#FF69B4', darkD:'#E04090', lightA:'#D03080', lightD:'#B02060' },
  { key:'cyan',   label:'Ciano',   darkA:'#00D4FF', darkD:'#00A0CC', lightA:'#0090B0', lightD:'#006080' },
];
const buildTheme = (isDark, accentKey) => {
  const base = isDark ? {...DARK} : {...LIGHT};
  const ac = ACCENT_OPTIONS.find(a => a.key === accentKey);
  if (ac) { base.accent = isDark ? ac.darkA : ac.lightA; base.accentD = isDark ? ac.darkD : ac.lightD; }
  return base;
};

// ─── THEME CONTEXT ───────────────────────────────────────────────────────────
const ThemeCtx = createContext(null);
const useTheme = () => useContext(ThemeCtx);

// ─── DATA ─────────────────────────────────────────────────────────────────────
const WORKOUTS = {
  Emagrecimento: {
    Iniciante: {
      name:'Cardio + Força Básica',
      time:'50 min',
      tip:'Descanse 60s entre séries. Foque na execução correta antes de aumentar a carga.',
      exercises:[
        {n:'Aquecimento — Caminhada Rápida',  s:'10 min contínuo'},
        {n:'Agachamento Livre (sem peso)',     s:'3×15 — desça até 90°'},
        {n:'Flexão de Braço (joelhos)',        s:'3×12 — peito toca o chão'},
        {n:'Afundo Alternado',                 s:'3×10 cada perna'},
        {n:'Abdominal Crunch',                 s:'3×20 — exhale na subida'},
        {n:'Prancha Frontal',                  s:'3×30s — core contraído'},
        {n:'Polichinelo',                      s:'3×40 — ritmo moderado'},
        {n:'Caminhada/Corrida Leve',           s:'15 min — finalizar'},
      ],
    },
    Intermediário: {
      name:'HIIT Metabólico',
      time:'45 min',
      tip:'Descanse apenas 30–40s entre exercícios. Mantenha a intensidade alta para queima máxima de calorias.',
      exercises:[
        {n:'Aquecimento Dinâmico',             s:'5 min — mobilidade articular'},
        {n:'Burpee',                           s:'4×10 — explosivo na subida'},
        {n:'Agachamento com Salto',            s:'4×12 — aterrisse suave'},
        {n:'Mountain Climber',                 s:'4×20 alternados — core firme'},
        {n:'Flexão Explosiva',                 s:'4×10 — palmas saem do chão'},
        {n:'Afundo com Joelho no Chão',        s:'4×10 cada — tronco ereto'},
        {n:'Abdominal Bicicleta',              s:'4×20 alternados — cotovelo ao joelho'},
        {n:'Corrida Intervalada',              s:'10 min — 1min forte / 1min leve'},
      ],
    },
    Avançado: {
      name:'Circuit Training Intenso',
      time:'60 min',
      tip:'Circuito sem descanso entre exercícios, 90s de descanso entre rounds. Alta queima calórica e preservação muscular.',
      exercises:[
        {n:'Aquecimento Dinâmico + Mobilidade',s:'7 min'},
        {n:'Deadlift Romeno (peso moderado)',   s:'4×10 — costas neutras'},
        {n:'Agachamento Goblet c/ Kettlebell', s:'4×15 — amplitude total'},
        {n:'Box Jump',                         s:'5×8 — aterrissagem silenciosa'},
        {n:'Kettlebell Swing',                 s:'5×15 — quadril é o motor'},
        {n:'Flexão Diamante',                  s:'4×12 — tríceps em foco'},
        {n:'Battle Rope (ondas alternadas)',   s:'5×30s — ombros não elevam'},
        {n:'Sprint + Caminhada',               s:'8 rounds de 30s forte / 30s leve'},
      ],
    },
  },

  'Ganho de Massa': {
    Iniciante: {
      name:'Full Body — Força Base',
      time:'55 min',
      tip:'Descanso de 90s–2min entre séries. Progrida a carga 2,5–5kg quando completar todas as séries com boa forma.',
      exercises:[
        {n:'Agachamento Livre',                s:'4×10 — barra no trapézio'},
        {n:'Supino Reto com Halteres',         s:'4×10 — cotovelo a 75°'},
        {n:'Remada Curvada com Barra',         s:'4×10 — tronco a 45°, costas neutras'},
        {n:'Desenvolvimento Militar c/ Halteres',s:'3×12 — não hiperestenda o lombar'},
        {n:'Rosca Direta com Barra',           s:'3×12 — sem balanço de tronco'},
        {n:'Tríceps Testa com Halteres',       s:'3×12 — cotovelhos fixos'},
        {n:'Panturrilha em Pé (leg press)',    s:'4×20 — amplitude completa'},
        {n:'Prancha + Abdominal Reto',         s:'3×30s prancha + 3×15 crunch'},
      ],
    },
    Intermediário: {
      name:'Costas + Bíceps (Pull Day)',
      time:'60 min',
      tip:'Descanso de 2–3min nos compostos, 60–90s nos isoladores. Sinta o músculo trabalhando em cada rep.',
      exercises:[
        {n:'Barra Fixa (supinada ou pronada)',  s:'4×8 — amplitude completa'},
        {n:'Remada Curvada com Barra',          s:'4×8 — carga alta, forma impecável'},
        {n:'Remada Unilateral c/ Halteres',     s:'4×10 cada — cotovelo para trás'},
        {n:'Pulldown Triângulo (corda)',         s:'3×12 — puxe até o peito'},
        {n:'Remada Baixa (cabo)',                s:'3×12 — peito no apoio'},
        {n:'Rosca Direta com Barra',            s:'4×10 — supinação completa no topo'},
        {n:'Rosca Martelo com Halteres',        s:'4×10 — braquial em foco'},
        {n:'Rosca Concentrada',                 s:'3×12 cada — contração máxima'},
      ],
    },
    Avançado: {
      name:'Pernas — Hipertrofia Máxima',
      time:'70 min',
      tip:'Descanso de 3–4min no agachamento e levantamento. Volume alto = crescimento máximo. Hidrate bem.',
      exercises:[
        {n:'Agachamento Livre (força)',         s:'5×6 — 80% 1RM, profundo'},
        {n:'Leg Press 45°',                     s:'4×12 — pés afastados, amplitude total'},
        {n:'Hack Squat',                        s:'4×10 — joelhos acompanham os pés'},
        {n:'Stiff com Barra',                   s:'4×10 — sinta o alongamento dos isquios'},
        {n:'Cadeira Extensora',                 s:'3×15 — contração no topo 1s'},
        {n:'Cadeira Flexora',                   s:'3×12 — não use impulso'},
        {n:'Panturrilha no Smith',              s:'5×20 — pausa de 2s no alongamento'},
        {n:'Abdominal com Peso (cabo)',         s:'4×15 — sem soltar a carga'},
      ],
    },
  },

  Condicionamento: {
    Iniciante: {
      name:'Funcional Full Body',
      time:'45 min',
      tip:'Foco em qualidade de movimento. Descanse 60s entre séries. Alongue ao final por 5 minutos.',
      exercises:[
        {n:'Pular Corda (aquecimento)',         s:'3 min contínuo'},
        {n:'Agachamento com Peso Corporal',     s:'3×15 — postura ereta'},
        {n:'Flexão de Braço',                   s:'3×12 — corpo reto como prancha'},
        {n:'Remada com Elástico',               s:'3×15 — retração escapular'},
        {n:'Afundo Estático',                   s:'3×10 cada perna'},
        {n:'Abdominal Reto',                    s:'3×20 — lombar no chão'},
        {n:'Prancha Lateral',                   s:'3×20s cada lado — quadril elevado'},
        {n:'Alongamento + Respiração',          s:'5 min — mobilidade e recuperação'},
      ],
    },
    Intermediário: {
      name:'Força + Resistência',
      time:'60 min',
      tip:'Equilibra força e capacidade aeróbica. Descanso de 90s nos compostos, 45s nos circuitos.',
      exercises:[
        {n:'Supino Reto com Barra',             s:'4×10 — carga moderada-alta'},
        {n:'Remada Baixa (cabo)',                s:'4×10 — core estabilizado'},
        {n:'Desenvolvimento Militar',           s:'4×10 — sem arqueamento'},
        {n:'Agachamento com Barra',             s:'4×12 — ritmo controlado'},
        {n:'Leg Press',                         s:'4×15 — amplitude completa'},
        {n:'Stiff com Halteres',               s:'3×12 — isquiotibiais em foco'},
        {n:'Abdominal Prancha + Rotação',       s:'3×15 cada lado'},
        {n:'Cardio Moderado (bike/esteira)',     s:'12 min — FC 65–75% máx'},
      ],
    },
    Avançado: {
      name:'Performance Atlética',
      time:'70 min',
      tip:'Treinamento de alta performance. Foco em força, potência e resistência simultâneos. 2–3min de descanso nos levantamentos.',
      exercises:[
        {n:'Levantamento Terra',                s:'5×5 — máximo esforço'},
        {n:'Supino Reto (força)',               s:'5×5 — 85% 1RM'},
        {n:'Puxada Frente (barra larga)',       s:'5×8 — amplitude total'},
        {n:'Agachamento Frontal',               s:'4×6 — cotovelos altos'},
        {n:'Desenvolvimento Militar c/ Barra', s:'4×8 — sem impulso de pernas'},
        {n:'Remada Curvada',                    s:'4×8 — carga alta'},
        {n:'Complexo Kettlebell',               s:'3 rounds — swing+clean+press+squat'},
        {n:'Sprints de 30m',                    s:'8×30m — descanso completo entre'},
      ],
    },
  },
};

const MEALS = {
  Emagrecimento: {
    calorias: 1750,
    macro:    'Alto proteína · Baixo carbo · Déficit ~300kcal',
    refeicoes:[
      {
        nome:'☀️ Café da Manhã',
        itens:'3 ovos mexidos (ovos inteiros) · 40g aveia com leite desnatado · 1 banana pequena · café sem açúcar',
        detalhes:'Proteína + fibras para saciedade matinal. Evite açúcar refinado.',
        kcal:420,
      },
      {
        nome:'🌿 Lanche da Manhã',
        itens:'170g iogurte grego natural (0% gordura) · 1 col. sopa de chia · 1 col. chá de mel',
        detalhes:'Rico em proteína e probióticos. A chia fornece ômega-3 e fibras.',
        kcal:155,
      },
      {
        nome:'🌞 Almoço',
        itens:'150g frango grelhado (filé) · 100g arroz integral cozido · 3 col. sopa de feijão · salada verde à vontade · 1 fio de azeite extravirgem',
        detalhes:'Refeição principal. Carboidratos complexos + proteína magra. Salada sem limite.',
        kcal:580,
      },
      {
        nome:'🍎 Lanche da Tarde',
        itens:'1 maçã média · 25g amendoim torrado sem sal · 1 copo de água com limão',
        detalhes:'Gordura boa do amendoim + fibra da maçã = saciedade até o jantar.',
        kcal:210,
      },
      {
        nome:'🌙 Jantar',
        itens:'120g atum natural (sem óleo) · 150g batata-doce cozida · salada de folhas verdes · vinagrete de limão',
        detalhes:'Refeição leve e proteica. Batata-doce tem índice glicêmico baixo-médio.',
        kcal:385,
      },
    ],
  },

  'Ganho de Massa': {
    calorias: 3050,
    macro:    'Muito alto proteína · Alto carbo · Superávit ~300kcal',
    refeicoes:[
      {
        nome:'☀️ Café da Manhã',
        itens:'4 ovos mexidos inteiros · 80g aveia com 300ml leite integral · 1 banana + 1 col. sopa de pasta de amendoim · 1 scoop whey protein (30g)',
        detalhes:'Maior refeição do dia. Proteína + carbo + gordura para iniciar a síntese proteica.',
        kcal:820,
      },
      {
        nome:'🥪 Lanche da Manhã',
        itens:'2 fatias de pão integral · 100g frango desfiado temperado · 1 fatia de queijo prato · 1 fruta (laranja ou maçã)',
        detalhes:'Refeição intermediária para manter o balanço nitrogenado positivo.',
        kcal:460,
      },
      {
        nome:'🌞 Almoço',
        itens:'200g arroz branco ou integral cozido · 100g feijão cozido · 200g carne vermelha magra (patinho/coxão) · salada verde · 2 col. sopa de azeite',
        detalhes:'Refeição mais calórica do dia. Carboidratos para energia e proteína para construção.',
        kcal:950,
      },
      {
        nome:'⚡ Pré-Treino',
        itens:'1 banana grande · 30g amendoim · 1 batata-doce pequena (100g) · água ou café pré-treino',
        detalhes:'Consuma 30–60 min antes do treino. Energia rápida + sustentada para performance máxima.',
        kcal:310,
      },
      {
        nome:'💪 Pós-Treino',
        itens:'1,5 scoop whey protein (45g) · 300ml leite integral · 1 banana · 1 col. chá de mel',
        detalhes:'Janela anabólica: consuma em até 30 min após o treino. Prioridade máxima.',
        kcal:510,
      },
      {
        nome:'🌙 Jantar',
        itens:'150g macarrão integral cozido · 120g atum em água · molho de tomate natural · 1 col. sopa de azeite · salada',
        detalhes:'Última refeição sólida. Carbo + proteína para recuperação noturna.',
        kcal:600,
      },
    ],
  },

  Condicionamento: {
    calorias: 2250,
    macro:    'Proteína moderada-alta · Carbo equilibrado · Manutenção calórica',
    refeicoes:[
      {
        nome:'☀️ Café da Manhã',
        itens:'3 ovos estrelados · 2 fatias pão integral · 1 fatia de queijo branco · 1 fruta da estação · café ou chá sem açúcar',
        detalhes:'Proteína + carbo de qualidade. Evite pular o café: impacta desempenho no treino.',
        kcal:450,
      },
      {
        nome:'🌿 Lanche da Manhã',
        itens:'170g iogurte natural integral · 30g granola sem açúcar · 1 punhado de frutas vermelhas (100g)',
        detalhes:'Antioxidantes + probióticos. Ótimo para recuperação e imunidade.',
        kcal:240,
      },
      {
        nome:'🌞 Almoço',
        itens:'150g arroz integral · 100g feijão ou lentilha · 150g frango ou peixe grelhado · legumes refogados (abobrinha, cenoura, brócolis) · azeite',
        detalhes:'Refeição completa. Proteína + fibras + micronutrientes essenciais para o condicionamento.',
        kcal:720,
      },
      {
        nome:'⚡ Lanche Pré-Treino',
        itens:'1 banana · 20g pasta de amendoim · 1 copo de água de coco (200ml)',
        detalhes:'Energia imediata + eletrólitos. Consuma 40–60 min antes de treinar.',
        kcal:260,
      },
      {
        nome:'🌙 Jantar',
        itens:'150g salmão grelhado (ou atum) · 150g batata-doce assada · brócolis + cenoura no vapor · limão + azeite',
        detalhes:'Ômega-3 do salmão auxilia recuperação muscular e reduz inflamação.',
        kcal:430,
      },
      {
        nome:'🥛 Ceia',
        itens:'150g queijo cottage · 5 castanhas-do-pará · 1 col. chá de mel',
        detalhes:'Caseína (proteína de digestão lenta) = recuperação durante o sono.',
        kcal:150,
      },
    ],
  },
};

// ─── EXERCISE ALTERNATIVES ───────────────────────────────────────────────────
const EXERCISE_ALTS = {
  'Agachamento Livre (sem peso)':        [{n:'Agachamento Sumo',s:'3×15 — pés afastados, joelhos para fora'},{n:'Afundo Estático',s:'3×10 cada perna — tronco ereto'},{n:'Step-Up no Banco',s:'3×15 cada — suba completamente'}],
  'Flexão de Braço (joelhos)':           [{n:'Flexão no Banco Inclinado',s:'3×12 — mãos no banco, corpo reto'},{n:'Flexão na Parede',s:'3×20 — progressiva'},{n:'Supino c/ Halteres Leve',s:'3×12 — cotovelo 75°'}],
  'Afundo Alternado':                    [{n:'Agachamento Búlgaro',s:'3×10 cada — pé traseiro elevado'},{n:'Passada Lateral',s:'3×12 cada — joelho alinhado'},{n:'Step-Up no Banco',s:'3×12 cada — amplitude total'}],
  'Burpee':                              [{n:'Agachamento c/ Salto + Flexão',s:'4×8 — sequência explosiva'},{n:'Mountain Climber',s:'4×20 alternados — core firme'},{n:'Sprawl (sem salto)',s:'4×10 — versão adaptada'}],
  'Mountain Climber':                    [{n:'Prancha c/ Elevação de Joelho',s:'4×20 alternados — lento'},{n:'Abdominal Bicicleta',s:'4×20 alternados'},{n:'Corrida no Lugar',s:'4×30s — joelhos altos'}],
  'Agachamento com Salto':               [{n:'Agachamento Normal',s:'4×15 — cadência 2-0-2'},{n:'Leg Press',s:'4×12 — amplitude total'},{n:'Step-Up Explosivo',s:'4×10 cada'}],
  'Box Jump':                            [{n:'Step-Up no Banco',s:'5×10 cada — controlado'},{n:'Agachamento c/ Salto',s:'5×8 — aterrissagem suave'},{n:'Salto Vertical',s:'5×8 — foco na aterrissagem'}],
  'Kettlebell Swing':                    [{n:'Hip Thrust c/ Haltere',s:'5×15 — glúteo no topo'},{n:'Stiff c/ Halteres',s:'5×12 — isquiotibiais'},{n:'Agachamento c/ Salto',s:'5×12 — explosivo'}],
  'Agachamento Livre':                   [{n:'Leg Press 45°',s:'4×12 — amplitude total'},{n:'Hack Squat',s:'4×10 — joelhos acompanham pés'},{n:'Agachamento Goblet c/ Haltere',s:'4×12 — tronco ereto'}],
  'Supino Reto com Halteres':            [{n:'Flexão de Braço',s:'4×15 — corpo reto'},{n:'Crucifixo c/ Halteres',s:'4×12 — cotovelos semiflexos'},{n:'Supino Inclinado c/ Halteres',s:'4×10 — upper chest'}],
  'Remada Curvada com Barra':            [{n:'Remada Unilateral c/ Halteres',s:'4×10 cada'},{n:'Remada Baixa (cabo)',s:'4×10 — peito no apoio'},{n:'Pulldown c/ Corda',s:'4×12 — puxe ao peito'}],
  'Levantamento Terra':                  [{n:'Stiff c/ Barra',s:'5×5 — isquiotibiais'},{n:'Hip Thrust c/ Barra',s:'5×8 — glúteo máximo'},{n:'Remada Curvada',s:'5×6 — costas neutras'}],
  'Barra Fixa (supinada ou pronada)':    [{n:'Pulldown c/ Barra Larga',s:'4×8 — mesma amplitude'},{n:'Pulldown Triângulo',s:'4×10 — cotovelos para baixo'},{n:'Remada em Pé c/ Cabo',s:'4×12 — retração escapular'}],
  'Supino Reto com Barra':               [{n:'Supino c/ Halteres',s:'4×10 — range maior'},{n:'Flexão Explosiva',s:'4×10 — palmas saem do chão'},{n:'Crossover c/ Cabo',s:'4×12'}],
  'Desenvolvimento Militar c/ Halteres': [{n:'Arnold Press',s:'3×12 — rotação dos halteres'},{n:'Elevação Lateral',s:'3×15 — deltóide médio'},{n:'Elevação Frontal',s:'3×12 — deltóide anterior'}],
  'Pular Corda (aquecimento)':           [{n:'Polichinelo',s:'3 min contínuo — ritmo moderado'},{n:'Corrida no Lugar',s:'3 min — joelhos altos'},{n:'Step Lateral',s:'3 min — aquecimento alternativo'}],
  'Flexão de Braço':                     [{n:'Flexão nos Joelhos',s:'3×15 — versão adaptada'},{n:'Supino c/ Halteres',s:'3×12 — mesmo padrão de movimento'},{n:'Flexão no Banco',s:'3×12 — inclinada'}],
  'Agachamento com Peso Corporal':       [{n:'Leg Press',s:'3×15 — amplitude total'},{n:'Afundo Estático',s:'3×10 cada perna'},{n:'Agachamento Sumo',s:'3×15 — pés afastados'}],
};

// ─── WEEKLY REPORT ────────────────────────────────────────────────────────────
const buildWeeklyReport = (treinosLog, caloriasLog) => {
  const now = new Date();
  const day = now.getDay();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((day + 6) % 7) - 7);
  lastMonday.setHours(0,0,0,0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23,59,59,999);
  const inRange = (s) => { const d = new Date(s); return d >= lastMonday && d <= lastSunday; };
  const treinos = (treinosLog||[]).filter(d => inRange(d)).length;
  const calsArr = (caloriasLog||[]).filter(d => inRange(d.date));
  const avgCals = calsArr.length > 0 ? Math.round(calsArr.reduce((a,d) => a+d.kcal, 0) / calsArr.length) : null;
  if (treinos === 0 && !avgCals) return null;
  const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  return { treinos, avgCals, de:fmt(lastMonday), ate:fmt(lastSunday) };
};

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id:'first_workout',    emoji:'🥇', title:'Primeiro Passo',     desc:'Completou o primeiro treino',      check:(s) => s.total >= 1 },
  { id:'five_workouts',    emoji:'⚡', title:'Aquecendo',          desc:'5 treinos realizados',             check:(s) => s.total >= 5 },
  { id:'ten_workouts',     emoji:'🏋️', title:'Dedicado',           desc:'10 treinos realizados',            check:(s) => s.total >= 10 },
  { id:'fifty_workouts',   emoji:'💪', title:'Veterano',           desc:'50 treinos realizados',            check:(s) => s.total >= 50 },
  { id:'hundred_workouts', emoji:'🏆', title:'Centenário',         desc:'100 treinos realizados',           check:(s) => s.total >= 100 },
  { id:'week_streak',      emoji:'🔥', title:'Semana de Fogo',     desc:'7 dias consecutivos treinando',    check:(s) => s.maxStreak >= 7 },
  { id:'month_streak',     emoji:'⚔️', title:'Guerreiro do Mês',   desc:'30 dias consecutivos treinando',  check:(s) => s.maxStreak >= 30 },
  { id:'hydration_7',      emoji:'💧', title:'Hidratado',          desc:'Meta de água atingida 7 vezes',   check:(s) => s.aguaGoal >= 7 },
  { id:'hydration_30',     emoji:'🌊', title:'Mestre da Água',     desc:'Meta de água atingida 30 vezes',  check:(s) => s.aguaGoal >= 30 },
  { id:'weight_goal',      emoji:'🎯', title:'Meta Alcançada',     desc:'Atingiu a meta de peso definida', check:(s) => s.weightGoalReached },
  { id:'custom_workout',   emoji:'✏️', title:'Criador',            desc:'Criou um treino personalizado',   check:(s) => s.hasCustom },
];

const checkNewAchievements = (stats, current) => {
  return ACHIEVEMENTS.filter(a => !current.includes(a.id) && a.check(stats)).map(a => a.id);
};

// ─── CARDIO ───────────────────────────────────────────────────────────────────
const CARDIO_ACTIVITIES = [
  { id:'corrida',   label:'Corrida',   emoji:'🏃', met:8.0,  kcalKm:70 },
  { id:'bike',      label:'Bike',      emoji:'🚴', met:6.0,  kcalKm:40 },
  { id:'natacao',   label:'Natação',   emoji:'🏊', met:7.0,  kcalKm:null },
  { id:'caminhada', label:'Caminhada', emoji:'🚶', met:3.5,  kcalKm:50 },
];
const calcCardioKcal = (met, weightKg, timeMins) => Math.round(met * weightKg * (timeMins / 60));

const GRUPOS_MUSCULARES = [
  { id:'peito',    label:'Peito',     abbr:'PE',  cor:'#e74c3c' },
  { id:'costas',   label:'Costas',    abbr:'CO',  cor:'#3498db' },
  { id:'ombros',   label:'Ombros',    abbr:'OM',  cor:'#9b59b6' },
  { id:'biceps',   label:'Bíceps',    abbr:'BI',  cor:'#2ecc71' },
  { id:'triceps',  label:'Tríceps',   abbr:'TRI', cor:'#1abc9c' },
  { id:'pernas',   label:'Pernas',    abbr:'PER', cor:'#e67e22' },
  { id:'gluteos',  label:'Glúteos',   abbr:'GL',  cor:'#e91e63' },
  { id:'abdomen',  label:'Abdômen',   abbr:'AB',  cor:'#f39c12' },
  { id:'fullbody', label:'Full Body', abbr:'FB',  cor:'#00bcd4' },
];
// Migration helper: old format was a plain string, new is { treino, grupo }
const getPlanDay = (semana, i) => {
  const v = semana?.[i];
  if (!v) return { treino: null, grupo: null };
  if (typeof v === 'string') return { treino: v, grupo: null };
  return { treino: v.treino ?? null, grupo: v.grupo ?? null };
};

// ─── MICRONUTRIENTES ─────────────────────────────────────────────────────────
const CATEGORY_MICROS_PER_100 = {
  'Proteínas':    { vitD:0.3, ferro:1.8, calcio:15,  fibra:0,   zinco:2.5, vitC:0,  potassio:350 },
  'Carboidratos': { vitD:0,   ferro:0.8, calcio:12,  fibra:2.5, zinco:0.5, vitC:0,  potassio:120 },
  'Vegetais':     { vitD:0,   ferro:1.0, calcio:48,  fibra:2.8, zinco:0.5, vitC:40, potassio:290 },
  'Frutas':       { vitD:0,   ferro:0.3, calcio:14,  fibra:2.0, zinco:0.2, vitC:35, potassio:220 },
  'Laticínios':   { vitD:0.8, ferro:0.1, calcio:130, fibra:0,   zinco:0.9, vitC:1,  potassio:150 },
  'Pratos':       { vitD:0.1, ferro:1.2, calcio:28,  fibra:1.5, zinco:1.5, vitC:5,  potassio:200 },
  'Doces':        { vitD:0,   ferro:0.4, calcio:18,  fibra:0.5, zinco:0.3, vitC:0,  potassio:80  },
  'Personalizado':{ vitD:0,   ferro:0.5, calcio:20,  fibra:0.5, zinco:0.5, vitC:0,  potassio:150 },
};
const MICROS_DRI = { vitD:15, ferro:18, calcio:1000, fibra:25, zinco:8, vitC:75, potassio:2600 };
const MICROS_LABELS = [
  { key:'vitC',    label:'Vit. C',   unit:'mg',  emoji:'🍊' },
  { key:'calcio',  label:'Cálcio',   unit:'mg',  emoji:'🦴' },
  { key:'ferro',   label:'Ferro',    unit:'mg',  emoji:'🔴' },
  { key:'fibra',   label:'Fibras',   unit:'g',   emoji:'🌾' },
  { key:'zinco',   label:'Zinco',    unit:'mg',  emoji:'⚡' },
  { key:'vitD',    label:'Vit. D',   unit:'mcg', emoji:'☀️' },
  { key:'potassio',label:'Potássio', unit:'mg',  emoji:'🍌' },
];

// ─── DESAFIOS SEMANAIS ────────────────────────────────────────────────────────
const DESAFIOS_SEMANAIS = [
  { id:'treinos5', emoji:'💪', title:'5 Treinos na Semana',      max:5, get:(d)=>d.treinosWeek  },
  { id:'agua5',    emoji:'💧', title:'Hidratação por 5 Dias',    max:5, get:(d)=>d.aguaWeek     },
  { id:'pr',       emoji:'🏆', title:'Bater um PR',              max:1, get:(d)=>d.prWeek       },
  { id:'cardio3',  emoji:'🏃', title:'3 Sessões de Cardio',      max:3, get:(d)=>d.cardioWeek   },
  { id:'sono5',    emoji:'😴', title:'5 Noites com 7h+',         max:5, get:(d)=>d.sonoWeek     },
  { id:'dieta5',   emoji:'🥗', title:'Dieta Registrada 5 Dias',  max:5, get:(d)=>d.dietaWeek    },
];

const calcPlates = (totalKg, barKg) => {
  const perSide = Math.round(((totalKg - barKg) / 2) * 1000) / 1000;
  if (perSide < 0) return null;
  const available = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
  let rem = perSide;
  const plates = [];
  for (const p of available) {
    while (rem >= p - 0.001) { plates.push(p); rem = Math.round((rem - p) * 1000) / 1000; }
  }
  return { perSide, plates, exact: rem < 0.01 };
};

// ─── DICA DO DIA ─────────────────────────────────────────────────────────────
const DICAS_DO_DIA = [
  '💧 Beba 500ml de água ao acordar — reidrata o corpo após o sono e acelera o metabolismo.',
  '🥩 Consuma proteína em todas as refeições para manter a síntese muscular elevada ao longo do dia.',
  '😴 Dormir 7-9h por noite é tão importante quanto treinar — é nesse período que o músculo cresce.',
  '🔥 Treinos de alta intensidade elevam o metabolismo por até 24h após o exercício (efeito EPOC).',
  '🧠 A mente falha antes do corpo. Quando quiser desistir de uma série, tente mais 2 repetições.',
  '⏱ O intervalo ideal entre séries para hipertrofia é de 60–90 segundos.',
  '🥗 Inclua vegetais coloridos em pelo menos 2 refeições — fornecem micronutrientes essenciais.',
  '🏃 30 minutos de caminhada diária já reduzem o risco de doenças cardiovasculares em 35%.',
  '💪 A sobrecarga progressiva — aumentar carga ou volume a cada semana — é o segredo do crescimento muscular.',
  '🍳 Omelete com 3 ovos = 18g de proteína. Um dos lanches mais rápidos e eficientes pós-treino.',
  '🧘 Alongar após o treino reduz DOMS (dor muscular tardia) e melhora a mobilidade a longo prazo.',
  '📊 O peso na balança pode subir nos primeiros dias de treino — é retenção hídrica, não gordura.',
  '🔄 Periodize seus treinos: varie o volume e a intensidade a cada 4-6 semanas para continuar evoluindo.',
  '🥜 Gorduras boas (abacate, castanhas, azeite) são essenciais para produção de testosterona.',
  '⚡ Cafeína 30–45min antes do treino aumenta força e resistência em 10–15%.',
  '🎯 Definir metas específicas ("ganhar 2kg de massa em 3 meses") é muito mais eficaz que metas vagas.',
  '🍌 Banana antes do treino = fonte rápida de energia + potássio que previne câimbras.',
  '🏋️ Exercícios compostos (agachamento, terra, supino) recrutam mais músculos e queimam mais calorias.',
  '💡 Grave seus treinos: quem registra as cargas evolui 30% mais rápido do que quem treina "de cabeça".',
  '🛌 Deitar na mesma hora todo dia regula o cortisol e melhora a qualidade do sono profundo.',
  '🥛 Whey isolado é absorvido em ~30min. Whey concentrado em ~60-90min. Ambos funcionam bem pós-treino.',
  '🔴 Carne vermelha magra 2-3x/semana fornece ferro heme, zinco e creatina naturais.',
  '📈 Aumentar a carga em apenas 1kg por semana resulta em 52kg a mais levantados em um ano.',
  '🌿 Brócolis, espinafre e couve são fontes naturais de nitratos que melhoram o desempenho aeróbico.',
  '⚖️ Para perda de gordura saudável, mire em 0,5–1% do peso corporal por semana.',
  '🤸 Mobilidade de quadril e tornozelos é o fator limitante mais comum no agachamento profundo.',
  '🧬 A síntese proteica muscular dura ~48h após o treino — por isso 2x/semana por grupo é o mínimo eficaz.',
  '🔋 Creatina monohidratada é o suplemento com mais evidência científica para força e hipertrofia.',
  '🍽 Comer de 3 a 5 horas antes do treino principal é o timing ideal para ter energia e não ter enjoo.',
  '📉 Déficit calórico extremo (>1000 kcal) causa perda de massa muscular. Seja paciente.',
];
const getDicaDia = () => {
  const idx = Math.floor((Date.now() / 86400000)) % DICAS_DO_DIA.length;
  return DICAS_DO_DIA[idx];
};

// ─── PERIODIZAÇÃO ─────────────────────────────────────────────────────────────
const FASES_MESOCICLO = [
  { id:'adaptacao',   label:'Adaptação',   cor:'#3498db', reps:'15-20', pct:60,  semanas:[1,3]  },
  { id:'hipertrofia', label:'Hipertrofia', cor:'#2ecc71', reps:'8-12',  pct:75,  semanas:[4,8]  },
  { id:'forca',       label:'Força',       cor:'#e67e22', reps:'4-6',   pct:87,  semanas:[9,11] },
  { id:'deload',      label:'Deload',      cor:'#9b59b6', reps:'12-15', pct:50,  semanas:[12,12]},
];
const getMesocicloFase = (startDate) => {
  if (!startDate) return null;
  const start = new Date(startDate); start.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const dias = Math.floor((today - start) / 86400000);
  const semana = Math.max(1, Math.floor(dias / 7) + 1);
  const s = ((semana - 1) % 12) + 1;
  const cicloNum = Math.floor((semana - 1) / 12) + 1;
  for (const f of FASES_MESOCICLO) {
    if (s >= f.semanas[0] && s <= f.semanas[1]) return { ...f, semana: s, ciclo: cicloNum };
  }
  return null;
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};
const calcRouteKm = (coords) => {
  let total = 0;
  for (let i = 1; i < coords.length; i++)
    total += haversineKm(coords[i-1].latitude, coords[i-1].longitude, coords[i].latitude, coords[i].longitude);
  return Math.round(total * 100) / 100;
};

// ─── MACROS & ALIMENTOS ───────────────────────────────────────────────────────
const MACRO_DIST = {
  'Emagrecimento':   { prot:0.30, carb:0.40, fat:0.30 },
  'Ganho de Massa':  { prot:0.30, carb:0.50, fat:0.20 },
  'Condicionamento': { prot:0.25, carb:0.50, fat:0.25 },
};
const calcMacros = (kcal, objetivo) => {
  const d = MACRO_DIST[objetivo] || { prot:0.25, carb:0.50, fat:0.25 };
  return { protG: Math.round(kcal*d.prot/4), carbG: Math.round(kcal*d.carb/4), fatG: Math.round(kcal*d.fat/9) };
};
const calcFoodEntry = (f, g) => ({
  kcal: Math.round(f.kcalPer100*g/100),
  prot: Math.round(f.protPer100*g/100*10)/10,
  carb: Math.round(f.carbPer100*g/100*10)/10,
  fat:  Math.round(f.fatPer100 *g/100*10)/10,
});
const normalizeStr = (s) => (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const FOOD_CATEGORIES = ['Proteínas', 'Carboidratos', 'Vegetais', 'Frutas', 'Laticínios', 'Pratos', 'Doces', 'Suplementos', 'Personalizado'];

const DEFAULT_FOODS = [
  // Proteínas
  { id:'f1',  name:'Frango Grelhado',         kcalPer100:165, protPer100:31.0, carbPer100:0,    fatPer100:3.6,  cat:'Proteínas' },
  { id:'f1b', name:'Frango Coxa/Sobrecoxa',   kcalPer100:215, protPer100:18.6, carbPer100:0,    fatPer100:15.0, cat:'Proteínas' },
  { id:'f1c', name:'Frango à Passarinho',     kcalPer100:280, protPer100:24.0, carbPer100:5.0,  fatPer100:18.0, cat:'Proteínas' },
  { id:'f4',  name:'Ovo Cozido',              kcalPer100:155, protPer100:13.0, carbPer100:1.1,  fatPer100:11.0, cat:'Proteínas' },
  { id:'f4b', name:'Ovo Frito',               kcalPer100:196, protPer100:13.6, carbPer100:0.8,  fatPer100:15.3, cat:'Proteínas' },
  { id:'f7',  name:'Whey Protein',            kcalPer100:380, protPer100:80.0, carbPer100:5.0,  fatPer100:2.0,  cat:'Proteínas' },
  { id:'f11', name:'Carne Bovina Magra',      kcalPer100:219, protPer100:26.0, carbPer100:0,    fatPer100:12.0, cat:'Proteínas' },
  { id:'f11b',name:'Picanha Grelhada',        kcalPer100:250, protPer100:26.0, carbPer100:0,    fatPer100:16.0, cat:'Proteínas' },
  { id:'f11c',name:'Carne Moída',             kcalPer100:215, protPer100:26.0, carbPer100:0,    fatPer100:12.0, cat:'Proteínas' },
  { id:'f12', name:'Atum em Lata',            kcalPer100:130, protPer100:28.0, carbPer100:0,    fatPer100:1.5,  cat:'Proteínas' },
  { id:'f16', name:'Carne Suína (Lombo)',     kcalPer100:211, protPer100:27.3, carbPer100:0,    fatPer100:11.0, cat:'Proteínas' },
  { id:'f17', name:'Peito de Peru',           kcalPer100:104, protPer100:22.0, carbPer100:0,    fatPer100:1.0,  cat:'Proteínas' },
  { id:'f18', name:'Salmão Grelhado',         kcalPer100:208, protPer100:20.0, carbPer100:0,    fatPer100:13.0, cat:'Proteínas' },
  { id:'f19', name:'Tilápia Grelhada',        kcalPer100:128, protPer100:26.0, carbPer100:0,    fatPer100:2.0,  cat:'Proteínas' },
  { id:'f20', name:'Camarão Cozido',          kcalPer100:99,  protPer100:24.0, carbPer100:0.2,  fatPer100:0.3,  cat:'Proteínas' },
  { id:'f21', name:'Linguiça',                kcalPer100:300, protPer100:13.0, carbPer100:2.0,  fatPer100:27.0, cat:'Proteínas' },
  { id:'f22', name:'Bacon',                   kcalPer100:541, protPer100:37.0, carbPer100:1.4,  fatPer100:42.0, cat:'Proteínas' },
  { id:'f23', name:'Presunto',                kcalPer100:145, protPer100:18.0, carbPer100:1.5,  fatPer100:7.0,  cat:'Proteínas' },
  { id:'f79', name:'Bacalhau Cozido',         kcalPer100:105, protPer100:23.0, carbPer100:0,    fatPer100:0.9,  cat:'Proteínas' },
  { id:'f80', name:'Sardinha em Lata',        kcalPer100:208, protPer100:24.6, carbPer100:0,    fatPer100:11.5, cat:'Proteínas' },
  { id:'f81', name:'Filé Mignon',             kcalPer100:201, protPer100:22.0, carbPer100:0,    fatPer100:12.0, cat:'Proteínas' },
  { id:'f82', name:'Tofu',                    kcalPer100:76,  protPer100:8.0,  carbPer100:1.9,  fatPer100:4.8,  cat:'Proteínas' },
  { id:'f83', name:'Carne Seca/Charque',      kcalPer100:250, protPer100:40.0, carbPer100:0,    fatPer100:10.0, cat:'Proteínas' },
  { id:'f84', name:'Clara de Ovo',            kcalPer100:52,  protPer100:11.0, carbPer100:0.7,  fatPer100:0.2,  cat:'Proteínas' },
  { id:'f85', name:'Proteína de Soja (PTS)',  kcalPer100:345, protPer100:52.0, carbPer100:32.0, fatPer100:1.0,  cat:'Proteínas' },
  { id:'f86', name:'Filé de Peixe Frito',     kcalPer100:200, protPer100:18.0, carbPer100:8.0,  fatPer100:11.0, cat:'Proteínas' },
  { id:'f87', name:'Carne de Sol',            kcalPer100:250, protPer100:35.0, carbPer100:0,    fatPer100:12.0, cat:'Proteínas' },
  { id:'f88', name:'Frango Empanado',         kcalPer100:250, protPer100:18.0, carbPer100:14.0, fatPer100:14.0, cat:'Proteínas' },
  { id:'f89', name:'Costela Bovina',          kcalPer100:280, protPer100:24.0, carbPer100:0,    fatPer100:20.0, cat:'Proteínas' },
  { id:'f90', name:'Mortadela',               kcalPer100:280, protPer100:12.0, carbPer100:3.0,  fatPer100:25.0, cat:'Proteínas' },
  { id:'f91', name:'Salsicha',                kcalPer100:257, protPer100:11.0, carbPer100:3.0,  fatPer100:23.0, cat:'Proteínas' },
  { id:'f92', name:'Atum Fresco Grelhado',    kcalPer100:144, protPer100:23.3, carbPer100:0,    fatPer100:5.0,  cat:'Proteínas' },
  { id:'f93', name:'Pescada Assada',          kcalPer100:90,  protPer100:18.0, carbPer100:0,    fatPer100:1.5,  cat:'Proteínas' },

  // Carboidratos
  { id:'f2',  name:'Arroz Branco Cozido',     kcalPer100:128, protPer100:2.5,  carbPer100:28.0, fatPer100:0.2,  cat:'Carboidratos' },
  { id:'f2b', name:'Arroz Integral Cozido',   kcalPer100:124, protPer100:2.6,  carbPer100:25.8, fatPer100:1.0,  cat:'Carboidratos' },
  { id:'f24', name:'Macarrão Cozido',         kcalPer100:158, protPer100:5.8,  carbPer100:31.0, fatPer100:0.9,  cat:'Carboidratos' },
  { id:'f9',  name:'Pão Integral',            kcalPer100:247, protPer100:9.0,  carbPer100:44.0, fatPer100:3.0,  cat:'Carboidratos' },
  { id:'f25', name:'Pão Francês',             kcalPer100:300, protPer100:8.0,  carbPer100:58.0, fatPer100:3.1,  cat:'Carboidratos' },
  { id:'f26', name:'Pão de Forma',            kcalPer100:253, protPer100:9.4,  carbPer100:49.9, fatPer100:3.0,  cat:'Carboidratos' },
  { id:'f27', name:'Tapioca',                 kcalPer100:240, protPer100:0,    carbPer100:60.0, fatPer100:0,    cat:'Carboidratos' },
  { id:'f6',  name:'Batata Doce Cozida',      kcalPer100:86,  protPer100:1.6,  carbPer100:20.0, fatPer100:0.1,  cat:'Carboidratos' },
  { id:'f28', name:'Batata Inglesa Cozida',   kcalPer100:52,  protPer100:1.2,  carbPer100:11.9, fatPer100:0.1,  cat:'Carboidratos' },
  { id:'f29', name:'Mandioca Cozida',         kcalPer100:125, protPer100:0.6,  carbPer100:30.1, fatPer100:0.3,  cat:'Carboidratos' },
  { id:'f30', name:'Quinoa Cozida',           kcalPer100:120, protPer100:4.4,  carbPer100:21.3, fatPer100:1.9,  cat:'Carboidratos' },
  { id:'f8',  name:'Aveia em Flocos',         kcalPer100:394, protPer100:13.9, carbPer100:66.0, fatPer100:8.5,  cat:'Carboidratos' },
  { id:'f31', name:'Granola',                 kcalPer100:471, protPer100:10.0, carbPer100:64.0, fatPer100:18.0, cat:'Carboidratos' },
  { id:'f94', name:'Cuscuz Marroquino',       kcalPer100:112, protPer100:3.8,  carbPer100:23.0, fatPer100:0.2,  cat:'Carboidratos' },
  { id:'f95', name:'Cuscuz Nordestino',       kcalPer100:154, protPer100:3.5,  carbPer100:33.0, fatPer100:0.5,  cat:'Carboidratos' },
  { id:'f96', name:'Pão Sírio',               kcalPer100:275, protPer100:9.0,  carbPer100:55.0, fatPer100:1.5,  cat:'Carboidratos' },
  { id:'f97', name:'Torrada',                 kcalPer100:411, protPer100:10.0, carbPer100:75.0, fatPer100:6.5,  cat:'Carboidratos' },
  { id:'f98', name:'Bolacha Água e Sal',      kcalPer100:432, protPer100:10.0, carbPer100:73.0, fatPer100:11.0, cat:'Carboidratos' },
  { id:'f99', name:'Polenta',                 kcalPer100:85,  protPer100:1.7,  carbPer100:18.0, fatPer100:0.5,  cat:'Carboidratos' },
  { id:'f100',name:'Inhame Cozido',           kcalPer100:118, protPer100:1.5,  carbPer100:27.6, fatPer100:0.2,  cat:'Carboidratos' },
  { id:'f101',name:'Farofa',                  kcalPer100:365, protPer100:2.0,  carbPer100:65.0, fatPer100:11.0, cat:'Carboidratos' },
  { id:'f102',name:'Crepioca',                kcalPer100:200, protPer100:9.0,  carbPer100:24.0, fatPer100:7.0,  cat:'Carboidratos' },
  { id:'f103',name:'Panqueca de Aveia',       kcalPer100:180, protPer100:8.0,  carbPer100:22.0, fatPer100:6.0,  cat:'Carboidratos' },
  { id:'f104',name:'Pão de Hambúrguer',       kcalPer100:280, protPer100:9.0,  carbPer100:50.0, fatPer100:5.0,  cat:'Carboidratos' },
  { id:'f105',name:'Wrap/Tortilla',           kcalPer100:290, protPer100:8.0,  carbPer100:50.0, fatPer100:6.5,  cat:'Carboidratos' },
  { id:'f106',name:'Milho Cozido',            kcalPer100:96,  protPer100:3.4,  carbPer100:21.0, fatPer100:1.5,  cat:'Carboidratos' },

  // Vegetais
  { id:'f3',  name:'Feijão Cozido',           kcalPer100:77,  protPer100:4.8,  carbPer100:14.0, fatPer100:0.5,  cat:'Vegetais' },
  { id:'f32', name:'Lentilha Cozida',         kcalPer100:93,  protPer100:6.3,  carbPer100:16.3, fatPer100:0.5,  cat:'Vegetais' },
  { id:'f33', name:'Grão de Bico Cozido',     kcalPer100:164, protPer100:8.9,  carbPer100:27.4, fatPer100:2.6,  cat:'Vegetais' },
  { id:'f34', name:'Brócolis Cozido',         kcalPer100:25,  protPer100:2.1,  carbPer100:4.4,  fatPer100:0.3,  cat:'Vegetais' },
  { id:'f35', name:'Cenoura Crua',            kcalPer100:41,  protPer100:0.9,  carbPer100:9.6,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f36', name:'Tomate',                  kcalPer100:18,  protPer100:0.9,  carbPer100:3.9,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f37', name:'Alface',                  kcalPer100:15,  protPer100:1.4,  carbPer100:2.9,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f38', name:'Abóbora Cozida',          kcalPer100:26,  protPer100:1.0,  carbPer100:6.5,  fatPer100:0.1,  cat:'Vegetais' },
  { id:'f107',name:'Espinafre Cru',           kcalPer100:23,  protPer100:2.9,  carbPer100:3.6,  fatPer100:0.4,  cat:'Vegetais' },
  { id:'f108',name:'Couve Refogada',          kcalPer100:35,  protPer100:2.0,  carbPer100:4.0,  fatPer100:1.5,  cat:'Vegetais' },
  { id:'f109',name:'Repolho Cru',             kcalPer100:25,  protPer100:1.3,  carbPer100:5.8,  fatPer100:0.1,  cat:'Vegetais' },
  { id:'f110',name:'Pepino',                  kcalPer100:15,  protPer100:0.7,  carbPer100:3.6,  fatPer100:0.1,  cat:'Vegetais' },
  { id:'f111',name:'Pimentão',                kcalPer100:31,  protPer100:1.0,  carbPer100:6.0,  fatPer100:0.3,  cat:'Vegetais' },
  { id:'f112',name:'Beterraba Cozida',        kcalPer100:44,  protPer100:1.7,  carbPer100:10.0, fatPer100:0.2,  cat:'Vegetais' },
  { id:'f113',name:'Couve-flor Cozida',       kcalPer100:25,  protPer100:1.9,  carbPer100:5.0,  fatPer100:0.3,  cat:'Vegetais' },
  { id:'f114',name:'Vagem Cozida',            kcalPer100:35,  protPer100:1.8,  carbPer100:7.1,  fatPer100:0.1,  cat:'Vegetais' },
  { id:'f115',name:'Chuchu Cozido',           kcalPer100:19,  protPer100:0.6,  carbPer100:4.5,  fatPer100:0.1,  cat:'Vegetais' },
  { id:'f116',name:'Berinjela Cozida',        kcalPer100:35,  protPer100:0.8,  carbPer100:8.6,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f117',name:'Ervilha Cozida',          kcalPer100:81,  protPer100:5.4,  carbPer100:14.5, fatPer100:0.4,  cat:'Vegetais' },
  { id:'f118',name:'Cogumelo (Champignon)',   kcalPer100:22,  protPer100:3.1,  carbPer100:3.3,  fatPer100:0.3,  cat:'Vegetais' },
  { id:'f119',name:'Cebola Crua',             kcalPer100:40,  protPer100:1.1,  carbPer100:9.3,  fatPer100:0.1,  cat:'Vegetais' },
  { id:'f120',name:'Rúcula',                  kcalPer100:25,  protPer100:2.6,  carbPer100:3.7,  fatPer100:0.7,  cat:'Vegetais' },
  { id:'f121',name:'Aspargo Cozido',          kcalPer100:22,  protPer100:2.4,  carbPer100:4.1,  fatPer100:0.2,  cat:'Vegetais' },

  // Frutas
  { id:'f5',  name:'Banana',                  kcalPer100:89,  protPer100:1.1,  carbPer100:23.0, fatPer100:0.3,  cat:'Frutas' },
  { id:'f15', name:'Maçã',                    kcalPer100:52,  protPer100:0.3,  carbPer100:14.0, fatPer100:0.2,  cat:'Frutas' },
  { id:'f39', name:'Abacate',                 kcalPer100:160, protPer100:2.0,  carbPer100:8.5,  fatPer100:14.7, cat:'Frutas' },
  { id:'f40', name:'Abacaxi',                 kcalPer100:50,  protPer100:0.5,  carbPer100:13.1, fatPer100:0.1,  cat:'Frutas' },
  { id:'f41', name:'Laranja',                 kcalPer100:47,  protPer100:0.9,  carbPer100:11.8, fatPer100:0.1,  cat:'Frutas' },
  { id:'f42', name:'Mamão',                   kcalPer100:43,  protPer100:0.5,  carbPer100:10.8, fatPer100:0.1,  cat:'Frutas' },
  { id:'f43', name:'Morango',                 kcalPer100:32,  protPer100:0.7,  carbPer100:7.7,  fatPer100:0.3,  cat:'Frutas' },
  { id:'f44', name:'Uva',                     kcalPer100:69,  protPer100:0.7,  carbPer100:18.1, fatPer100:0.2,  cat:'Frutas' },
  { id:'f45', name:'Manga',                   kcalPer100:60,  protPer100:0.8,  carbPer100:15.0, fatPer100:0.4,  cat:'Frutas' },
  { id:'f46', name:'Melancia',                kcalPer100:33,  protPer100:0.6,  carbPer100:8.1,  fatPer100:0.2,  cat:'Frutas' },
  { id:'f122',name:'Kiwi',                    kcalPer100:61,  protPer100:1.1,  carbPer100:14.7, fatPer100:0.5,  cat:'Frutas' },
  { id:'f123',name:'Pera',                    kcalPer100:57,  protPer100:0.4,  carbPer100:15.2, fatPer100:0.1,  cat:'Frutas' },
  { id:'f124',name:'Pêssego',                 kcalPer100:39,  protPer100:0.9,  carbPer100:9.5,  fatPer100:0.3,  cat:'Frutas' },
  { id:'f125',name:'Ameixa',                  kcalPer100:46,  protPer100:0.7,  carbPer100:11.4, fatPer100:0.3,  cat:'Frutas' },
  { id:'f126',name:'Melão',                   kcalPer100:34,  protPer100:0.8,  carbPer100:8.2,  fatPer100:0.2,  cat:'Frutas' },
  { id:'f127',name:'Goiaba',                  kcalPer100:68,  protPer100:2.6,  carbPer100:14.3, fatPer100:1.0,  cat:'Frutas' },
  { id:'f128',name:'Caqui',                   kcalPer100:70,  protPer100:0.6,  carbPer100:18.6, fatPer100:0.2,  cat:'Frutas' },
  { id:'f129',name:'Maracujá',                kcalPer100:68,  protPer100:2.0,  carbPer100:16.0, fatPer100:0.4,  cat:'Frutas' },
  { id:'f130',name:'Coco Fresco',             kcalPer100:354, protPer100:3.3,  carbPer100:15.2, fatPer100:33.5, cat:'Frutas' },
  { id:'f131',name:'Tangerina',               kcalPer100:53,  protPer100:0.8,  carbPer100:13.3, fatPer100:0.3,  cat:'Frutas' },
  { id:'f132',name:'Limão',                   kcalPer100:29,  protPer100:1.1,  carbPer100:9.3,  fatPer100:0.3,  cat:'Frutas' },
  { id:'f133',name:'Figo',                    kcalPer100:74,  protPer100:0.8,  carbPer100:19.2, fatPer100:0.3,  cat:'Frutas' },

  // Laticínios e gorduras
  { id:'f10', name:'Iogurte Natural',         kcalPer100:61,  protPer100:3.5,  carbPer100:4.7,  fatPer100:3.3,  cat:'Laticínios' },
  { id:'f47', name:'Iogurte Grego',           kcalPer100:97,  protPer100:9.0,  carbPer100:3.6,  fatPer100:5.0,  cat:'Laticínios' },
  { id:'f13', name:'Leite Desnatado',         kcalPer100:35,  protPer100:3.4,  carbPer100:5.0,  fatPer100:0.1,  cat:'Laticínios' },
  { id:'f48', name:'Leite Integral',          kcalPer100:61,  protPer100:3.2,  carbPer100:4.7,  fatPer100:3.3,  cat:'Laticínios' },
  { id:'f14', name:'Queijo Cottage',          kcalPer100:98,  protPer100:11.0, carbPer100:3.4,  fatPer100:4.3,  cat:'Laticínios' },
  { id:'f49', name:'Queijo Mussarela',        kcalPer100:280, protPer100:22.0, carbPer100:2.2,  fatPer100:20.0, cat:'Laticínios' },
  { id:'f50', name:'Queijo Minas Frescal',    kcalPer100:264, protPer100:17.4, carbPer100:3.2,  fatPer100:20.2, cat:'Laticínios' },
  { id:'f51', name:'Requeijão',               kcalPer100:257, protPer100:9.6,  carbPer100:3.0,  fatPer100:23.0, cat:'Laticínios' },
  { id:'f52', name:'Manteiga',                kcalPer100:717, protPer100:0.9,  carbPer100:0.1,  fatPer100:81.1, cat:'Laticínios' },
  { id:'f53', name:'Azeite de Oliva',         kcalPer100:884, protPer100:0,    carbPer100:0,    fatPer100:100.0,cat:'Laticínios' },
  { id:'f54', name:'Pasta de Amendoim',       kcalPer100:588, protPer100:25.0, carbPer100:20.0, fatPer100:50.0, cat:'Laticínios' },
  { id:'f55', name:'Castanha do Pará',        kcalPer100:656, protPer100:14.3, carbPer100:12.3, fatPer100:66.4, cat:'Laticínios' },
  { id:'f56', name:'Amêndoas',                kcalPer100:579, protPer100:21.2, carbPer100:21.6, fatPer100:49.9, cat:'Laticínios' },
  { id:'f134',name:'Cream Cheese',            kcalPer100:342, protPer100:6.2,  carbPer100:4.1,  fatPer100:34.0, cat:'Laticínios' },
  { id:'f135',name:'Leite Condensado',        kcalPer100:321, protPer100:7.5,  carbPer100:54.4, fatPer100:8.0,  cat:'Laticínios' },
  { id:'f136',name:'Creme de Leite',          kcalPer100:292, protPer100:2.4,  carbPer100:3.5,  fatPer100:30.0, cat:'Laticínios' },
  { id:'f137',name:'Leite de Amêndoas',       kcalPer100:24,  protPer100:0.5,  carbPer100:1.0,  fatPer100:1.5,  cat:'Laticínios' },
  { id:'f138',name:'Leite de Aveia',          kcalPer100:47,  protPer100:1.0,  carbPer100:8.0,  fatPer100:1.0,  cat:'Laticínios' },
  { id:'f139',name:'Óleo de Coco',            kcalPer100:862, protPer100:0,    carbPer100:0,    fatPer100:100.0,cat:'Laticínios' },
  { id:'f140',name:'Nozes',                   kcalPer100:654, protPer100:15.2, carbPer100:13.7, fatPer100:65.2, cat:'Laticínios' },
  { id:'f141',name:'Castanha de Caju',        kcalPer100:553, protPer100:18.2, carbPer100:30.2, fatPer100:43.9, cat:'Laticínios' },
  { id:'f142',name:'Chia (semente)',          kcalPer100:486, protPer100:16.5, carbPer100:42.1, fatPer100:30.7, cat:'Laticínios' },
  { id:'f143',name:'Linhaça (semente)',       kcalPer100:534, protPer100:18.3, carbPer100:28.9, fatPer100:42.2, cat:'Laticínios' },

  // Pratos e fast food
  { id:'f57', name:'Pão de Queijo',           kcalPer100:320, protPer100:6.0,  carbPer100:29.0, fatPer100:19.0, cat:'Pratos' },
  { id:'f58', name:'Pizza Margherita (fatia)',kcalPer100:266, protPer100:11.0, carbPer100:33.0, fatPer100:10.0, cat:'Pratos' },
  { id:'f59', name:'Hambúrguer Completo',     kcalPer100:295, protPer100:17.0, carbPer100:24.0, fatPer100:14.0, cat:'Pratos' },
  { id:'f60', name:'Batata Frita',            kcalPer100:312, protPer100:3.4,  carbPer100:41.0, fatPer100:15.0, cat:'Pratos' },
  { id:'f61', name:'Coxinha',                 kcalPer100:280, protPer100:9.0,  carbPer100:24.0, fatPer100:17.0, cat:'Pratos' },
  { id:'f62', name:'Pastel Frito',            kcalPer100:320, protPer100:6.0,  carbPer100:30.0, fatPer100:20.0, cat:'Pratos' },
  { id:'f63', name:'Lasanha à Bolonhesa',     kcalPer100:145, protPer100:8.0,  carbPer100:13.0, fatPer100:7.0,  cat:'Pratos' },
  { id:'f64', name:'Feijoada',                kcalPer100:130, protPer100:9.0,  carbPer100:8.0,  fatPer100:7.0,  cat:'Pratos' },
  { id:'f65', name:'Strogonoff de Frango',    kcalPer100:195, protPer100:12.0, carbPer100:8.0,  fatPer100:13.0, cat:'Pratos' },
  { id:'f157',name:'Omelete com Queijo',      kcalPer100:195, protPer100:13.0, carbPer100:1.5,  fatPer100:15.0, cat:'Pratos' },
  { id:'f158',name:'Sanduíche Natural',       kcalPer100:210, protPer100:9.0,  carbPer100:28.0, fatPer100:7.0,  cat:'Pratos' },
  { id:'f159',name:'Wrap de Frango',          kcalPer100:220, protPer100:14.0, carbPer100:24.0, fatPer100:8.0,  cat:'Pratos' },
  { id:'f160',name:'Salada Completa',         kcalPer100:90,  protPer100:3.0,  carbPer100:8.0,  fatPer100:5.0,  cat:'Pratos' },
  { id:'f161',name:'Risoto',                  kcalPer100:170, protPer100:4.0,  carbPer100:25.0, fatPer100:6.0,  cat:'Pratos' },
  { id:'f162',name:'Nhoque',                  kcalPer100:140, protPer100:3.5,  carbPer100:28.0, fatPer100:1.5,  cat:'Pratos' },
  { id:'f163',name:'Polenta Frita',           kcalPer100:230, protPer100:2.5,  carbPer100:28.0, fatPer100:12.0, cat:'Pratos' },
  { id:'f164',name:'Quiche',                  kcalPer100:260, protPer100:8.0,  carbPer100:18.0, fatPer100:17.0, cat:'Pratos' },
  { id:'f165',name:'Esfirra',                 kcalPer100:280, protPer100:10.0, carbPer100:30.0, fatPer100:13.0, cat:'Pratos' },
  { id:'f166',name:'Kibe',                    kcalPer100:290, protPer100:13.0, carbPer100:20.0, fatPer100:18.0, cat:'Pratos' },
  { id:'f167',name:'Yakisoba',                kcalPer100:130, protPer100:5.0,  carbPer100:18.0, fatPer100:4.0,  cat:'Pratos' },
  { id:'f168',name:'Sushi (Combinado)',       kcalPer100:150, protPer100:6.0,  carbPer100:25.0, fatPer100:2.5,  cat:'Pratos' },
  { id:'f169',name:'Tapioca Recheada',        kcalPer100:220, protPer100:8.0,  carbPer100:30.0, fatPer100:7.0,  cat:'Pratos' },

  // Doces e bebidas
  { id:'f66', name:'Mel',                     kcalPer100:304, protPer100:0.3,  carbPer100:82.4, fatPer100:0,    cat:'Doces' },
  { id:'f67', name:'Açúcar Refinado',         kcalPer100:387, protPer100:0,    carbPer100:99.8, fatPer100:0,    cat:'Doces' },
  { id:'f68', name:'Chocolate ao Leite',      kcalPer100:535, protPer100:7.3,  carbPer100:59.4, fatPer100:29.7, cat:'Doces' },
  { id:'f69', name:'Chocolate Amargo 70%',    kcalPer100:598, protPer100:7.8,  carbPer100:45.9, fatPer100:42.6, cat:'Doces' },
  { id:'f70', name:'Bolo de Chocolate',       kcalPer100:371, protPer100:5.0,  carbPer100:50.0, fatPer100:17.0, cat:'Doces' },
  { id:'f71', name:'Biscoito Recheado',       kcalPer100:480, protPer100:5.5,  carbPer100:68.0, fatPer100:20.0, cat:'Doces' },
  { id:'f72', name:'Sorvete de Creme',        kcalPer100:207, protPer100:3.5,  carbPer100:23.6, fatPer100:11.0, cat:'Doces' },
  { id:'f73', name:'Pipoca sem Manteiga',     kcalPer100:387, protPer100:12.9, carbPer100:77.9, fatPer100:4.5,  cat:'Doces' },
  { id:'f74', name:'Barra de Cereal',         kcalPer100:380, protPer100:7.0,  carbPer100:70.0, fatPer100:8.0,  cat:'Doces' },
  { id:'f75', name:'Refrigerante Cola',       kcalPer100:42,  protPer100:0,    carbPer100:10.5, fatPer100:0,    cat:'Doces' },
  { id:'f76', name:'Suco de Laranja Natural', kcalPer100:45,  protPer100:0.7,  carbPer100:10.4, fatPer100:0.2,  cat:'Doces' },
  { id:'f77', name:'Água de Coco',            kcalPer100:22,  protPer100:0.1,  carbPer100:5.3,  fatPer100:0.1,  cat:'Doces' },
  { id:'f78', name:'Cerveja',                 kcalPer100:43,  protPer100:0.5,  carbPer100:3.6,  fatPer100:0,    cat:'Doces' },
  { id:'f144',name:'Geleia de Frutas',        kcalPer100:250, protPer100:0.3,  carbPer100:62.0, fatPer100:0.1,  cat:'Doces' },
  { id:'f145',name:'Achocolatado em Pó',      kcalPer100:396, protPer100:4.5,  carbPer100:80.0, fatPer100:4.5,  cat:'Doces' },
  { id:'f146',name:'Vitamina de Banana',      kcalPer100:95,  protPer100:3.3,  carbPer100:16.0, fatPer100:2.0,  cat:'Doces' },
  { id:'f147',name:'Açaí na Tigela',          kcalPer100:247, protPer100:0.8,  carbPer100:28.4, fatPer100:14.5, cat:'Doces' },
  { id:'f148',name:'Suco de Uva Integral',    kcalPer100:60,  protPer100:0.3,  carbPer100:15.0, fatPer100:0,    cat:'Doces' },
  { id:'f149',name:'Chá sem Açúcar',          kcalPer100:1,   protPer100:0,    carbPer100:0.2,  fatPer100:0,    cat:'Doces' },
  { id:'f150',name:'Energético',              kcalPer100:45,  protPer100:0,    carbPer100:11.0, fatPer100:0,    cat:'Doces' },
  { id:'f151',name:'Água Tônica',             kcalPer100:34,  protPer100:0,    carbPer100:8.8,  fatPer100:0,    cat:'Doces' },
  { id:'f152',name:'Iogurte com Frutas',      kcalPer100:89,  protPer100:3.0,  carbPer100:15.7, fatPer100:1.5,  cat:'Doces' },
  { id:'f153',name:'Pudim de Leite',          kcalPer100:156, protPer100:3.5,  carbPer100:25.0, fatPer100:4.5,  cat:'Doces' },
  { id:'f154',name:'Brigadeiro',              kcalPer100:411, protPer100:4.8,  carbPer100:56.9, fatPer100:18.8, cat:'Doces' },
  { id:'f155',name:'Paçoca',                  kcalPer100:488, protPer100:17.8, carbPer100:45.6, fatPer100:27.6, cat:'Doces' },
  { id:'f156',name:'Goiabada',                kcalPer100:287, protPer100:0.4,  carbPer100:73.1, fatPer100:0.1,  cat:'Doces' },

  // ── Proteínas extras ──
  { id:'f170',name:'Frango Peito Cru',        kcalPer100:109, protPer100:22.5, carbPer100:0,    fatPer100:1.9,  cat:'Proteínas' },
  { id:'f171',name:'Frango Assado no Forno',  kcalPer100:200, protPer100:27.0, carbPer100:1.0,  fatPer100:10.0, cat:'Proteínas' },
  { id:'f172',name:'Frango à Milanesa',       kcalPer100:255, protPer100:20.0, carbPer100:12.0, fatPer100:14.0, cat:'Proteínas' },
  { id:'f173',name:'Patinho Cozido',          kcalPer100:187, protPer100:24.0, carbPer100:0,    fatPer100:9.5,  cat:'Proteínas' },
  { id:'f174',name:'Alcatra Grelhada',        kcalPer100:207, protPer100:29.0, carbPer100:0,    fatPer100:9.5,  cat:'Proteínas' },
  { id:'f175',name:'Maminha Grelhada',        kcalPer100:219, protPer100:27.0, carbPer100:0,    fatPer100:11.0, cat:'Proteínas' },
  { id:'f176',name:'Contrafilé Grelhado',     kcalPer100:249, protPer100:25.0, carbPer100:0,    fatPer100:16.0, cat:'Proteínas' },
  { id:'f177',name:'Acém Cozido',             kcalPer100:218, protPer100:27.0, carbPer100:0,    fatPer100:11.5, cat:'Proteínas' },
  { id:'f178',name:'Músculo Cozido',          kcalPer100:162, protPer100:26.0, carbPer100:0,    fatPer100:5.5,  cat:'Proteínas' },
  { id:'f179',name:'Fígado Bovino Cozido',    kcalPer100:152, protPer100:22.0, carbPer100:4.5,  fatPer100:5.0,  cat:'Proteínas' },
  { id:'f180',name:'Coração de Frango',       kcalPer100:158, protPer100:26.0, carbPer100:0.2,  fatPer100:6.0,  cat:'Proteínas' },
  { id:'f181',name:'Frango Desfiado',         kcalPer100:150, protPer100:28.0, carbPer100:0,    fatPer100:4.0,  cat:'Proteínas' },
  { id:'f182',name:'Peixe Espada Grelhado',   kcalPer100:121, protPer100:21.0, carbPer100:0,    fatPer100:4.0,  cat:'Proteínas' },
  { id:'f183',name:'Linguado Grelhado',       kcalPer100:91,  protPer100:20.0, carbPer100:0,    fatPer100:1.2,  cat:'Proteínas' },
  { id:'f184',name:'Robalo Grelhado',         kcalPer100:118, protPer100:21.0, carbPer100:0,    fatPer100:3.5,  cat:'Proteínas' },
  { id:'f185',name:'Lula Cozida',             kcalPer100:92,  protPer100:15.6, carbPer100:3.1,  fatPer100:1.4,  cat:'Proteínas' },
  { id:'f186',name:'Polvo Cozido',            kcalPer100:82,  protPer100:14.9, carbPer100:2.2,  fatPer100:1.0,  cat:'Proteínas' },
  { id:'f187',name:'Mexilhão Cozido',         kcalPer100:172, protPer100:23.8, carbPer100:7.4,  fatPer100:4.5,  cat:'Proteínas' },
  { id:'f188',name:'Caranguejo Cozido',       kcalPer100:97,  protPer100:19.4, carbPer100:0.5,  fatPer100:1.8,  cat:'Proteínas' },
  { id:'f189',name:'Pernil Suíno Assado',     kcalPer100:240, protPer100:28.0, carbPer100:0,    fatPer100:14.0, cat:'Proteínas' },
  { id:'f190',name:'Costela Suína Assada',    kcalPer100:320, protPer100:22.0, carbPer100:0,    fatPer100:25.0, cat:'Proteínas' },
  { id:'f191',name:'Bisteca Suína Grelhada',  kcalPer100:212, protPer100:27.0, carbPer100:0,    fatPer100:11.0, cat:'Proteínas' },
  { id:'f192',name:'Pato Assado',             kcalPer100:337, protPer100:19.0, carbPer100:0,    fatPer100:28.4, cat:'Proteínas' },
  { id:'f193',name:'Codorna Assada',          kcalPer100:235, protPer100:25.0, carbPer100:0,    fatPer100:14.0, cat:'Proteínas' },
  { id:'f194',name:'Ovo de Codorna Cozido',   kcalPer100:158, protPer100:13.1, carbPer100:0.4,  fatPer100:11.1, cat:'Proteínas' },
  { id:'f195',name:'Albumina (ovo)',          kcalPer100:344, protPer100:80.0, carbPer100:4.5,  fatPer100:0.8,  cat:'Proteínas' },
  { id:'f196',name:'Peito de Frango Cozido',  kcalPer100:159, protPer100:32.0, carbPer100:0,    fatPer100:3.5,  cat:'Proteínas' },
  { id:'f197',name:'Carne Moída Grelhada',    kcalPer100:225, protPer100:26.0, carbPer100:0,    fatPer100:13.0, cat:'Proteínas' },
  { id:'f198',name:'Presunto Cru (Parma)',    kcalPer100:230, protPer100:25.0, carbPer100:0.3,  fatPer100:14.0, cat:'Proteínas' },
  { id:'f199',name:'Frango Temperado',        kcalPer100:178, protPer100:29.0, carbPer100:2.0,  fatPer100:6.0,  cat:'Proteínas' },
  { id:'f200',name:'Merluza Grelhada',        kcalPer100:86,  protPer100:17.8, carbPer100:0,    fatPer100:1.4,  cat:'Proteínas' },
  { id:'f201',name:'Cação Grelhado',          kcalPer100:109, protPer100:23.0, carbPer100:0,    fatPer100:1.8,  cat:'Proteínas' },
  { id:'f202',name:'Pacu Assado',             kcalPer100:153, protPer100:22.5, carbPer100:0,    fatPer100:6.8,  cat:'Proteínas' },
  { id:'f203',name:'Pintado Grelhado',        kcalPer100:112, protPer100:22.0, carbPer100:0,    fatPer100:2.5,  cat:'Proteínas' },
  { id:'f204',name:'Frango Xadrez',           kcalPer100:145, protPer100:18.0, carbPer100:8.0,  fatPer100:5.0,  cat:'Proteínas' },
  { id:'f205',name:'Peito Peru Assado',       kcalPer100:112, protPer100:24.0, carbPer100:0,    fatPer100:1.5,  cat:'Proteínas' },

  // ── Carboidratos extras ──
  { id:'f206',name:'Farinha de Trigo',        kcalPer100:361, protPer100:9.8,  carbPer100:75.1, fatPer100:1.4,  cat:'Carboidratos' },
  { id:'f207',name:'Farinha de Mandioca',     kcalPer100:361, protPer100:1.6,  carbPer100:88.1, fatPer100:0.3,  cat:'Carboidratos' },
  { id:'f208',name:'Fubá de Milho',           kcalPer100:357, protPer100:8.5,  carbPer100:74.3, fatPer100:1.3,  cat:'Carboidratos' },
  { id:'f209',name:'Macarrão Integral Cozido',kcalPer100:124, protPer100:5.0,  carbPer100:22.8, fatPer100:1.4,  cat:'Carboidratos' },
  { id:'f210',name:'Espaguete Cozido',        kcalPer100:158, protPer100:5.5,  carbPer100:31.2, fatPer100:0.9,  cat:'Carboidratos' },
  { id:'f211',name:'Pão de Centeio',          kcalPer100:258, protPer100:8.5,  carbPer100:48.3, fatPer100:3.3,  cat:'Carboidratos' },
  { id:'f212',name:'Pão de Milho',            kcalPer100:289, protPer100:6.0,  carbPer100:52.5, fatPer100:7.0,  cat:'Carboidratos' },
  { id:'f213',name:'Biscoito de Polvilho',    kcalPer100:441, protPer100:3.5,  carbPer100:55.3, fatPer100:23.5, cat:'Carboidratos' },
  { id:'f214',name:'Rosquinha de Maizena',    kcalPer100:460, protPer100:7.0,  carbPer100:70.5, fatPer100:16.0, cat:'Carboidratos' },
  { id:'f215',name:'Batata Baroa Cozida',     kcalPer100:62,  protPer100:1.0,  carbPer100:14.2, fatPer100:0.1,  cat:'Carboidratos' },
  { id:'f216',name:'Feijão Fradinho Cozido',  kcalPer100:70,  protPer100:5.5,  carbPer100:12.2, fatPer100:0.4,  cat:'Carboidratos' },
  { id:'f217',name:'Feijão Preto Cozido',     kcalPer100:77,  protPer100:4.5,  carbPer100:14.0, fatPer100:0.5,  cat:'Carboidratos' },
  { id:'f218',name:'Feijão Carioca Cozido',   kcalPer100:76,  protPer100:4.8,  carbPer100:13.6, fatPer100:0.5,  cat:'Carboidratos' },
  { id:'f219',name:'Soja Cozida',             kcalPer100:141, protPer100:14.4, carbPer100:11.5, fatPer100:5.7,  cat:'Carboidratos' },
  { id:'f220',name:'Macarrão de Arroz Cozido',kcalPer100:140, protPer100:2.8,  carbPer100:31.0, fatPer100:0.2,  cat:'Carboidratos' },
  { id:'f221',name:'Canjica Branca Cozida',   kcalPer100:137, protPer100:3.0,  carbPer100:30.5, fatPer100:0.6,  cat:'Carboidratos' },
  { id:'f222',name:'Flocos de Milho (cornflakes)',kcalPer100:378,protPer100:7.5,carbPer100:84.0,fatPer100:0.5, cat:'Carboidratos' },
  { id:'f223',name:'Arroz Vermelho Cozido',   kcalPer100:130, protPer100:2.8,  carbPer100:27.5, fatPer100:1.0,  cat:'Carboidratos' },
  { id:'f224',name:'Arroz Negro Cozido',      kcalPer100:121, protPer100:3.2,  carbPer100:26.1, fatPer100:1.1,  cat:'Carboidratos' },
  { id:'f225',name:'Pipoca com Manteiga',     kcalPer100:450, protPer100:9.0,  carbPer100:63.0, fatPer100:18.0, cat:'Carboidratos' },
  { id:'f226a',name:'Beiju de Tapioca',       kcalPer100:240, protPer100:0.4,  carbPer100:60.2, fatPer100:0.1,  cat:'Carboidratos' },
  { id:'f226b',name:'Pão Sovado',             kcalPer100:310, protPer100:7.5,  carbPer100:56.0, fatPer100:6.5,  cat:'Carboidratos' },
  { id:'f226c',name:'Bolo de Milho',          kcalPer100:310, protPer100:5.0,  carbPer100:50.5, fatPer100:10.0, cat:'Carboidratos' },
  { id:'f226d',name:'Macarrão Fusilli Cozido',kcalPer100:150, protPer100:5.5,  carbPer100:29.0, fatPer100:1.0,  cat:'Carboidratos' },
  { id:'f226e',name:'Penne Cozido',           kcalPer100:153, protPer100:5.8,  carbPer100:30.5, fatPer100:0.9,  cat:'Carboidratos' },
  { id:'f226f',name:'Arroz Parboilizado Cozido',kcalPer100:130,protPer100:2.6, carbPer100:28.5, fatPer100:0.3,  cat:'Carboidratos' },

  // ── Vegetais extras ──
  { id:'f227',name:'Quiabo Cozido',           kcalPer100:33,  protPer100:2.0,  carbPer100:7.6,  fatPer100:0.1,  cat:'Vegetais' },
  { id:'f228',name:'Jiló Cozido',             kcalPer100:23,  protPer100:0.9,  carbPer100:5.0,  fatPer100:0.3,  cat:'Vegetais' },
  { id:'f229',name:'Nabo Cozido',             kcalPer100:22,  protPer100:0.9,  carbPer100:4.3,  fatPer100:0.3,  cat:'Vegetais' },
  { id:'f230',name:'Agrião Cru',              kcalPer100:20,  protPer100:2.3,  carbPer100:1.3,  fatPer100:0.7,  cat:'Vegetais' },
  { id:'f231',name:'Acelga Cozida',           kcalPer100:19,  protPer100:1.8,  carbPer100:3.4,  fatPer100:0.1,  cat:'Vegetais' },
  { id:'f232',name:'Abobrinha Cozida',        kcalPer100:26,  protPer100:1.5,  carbPer100:5.5,  fatPer100:0.3,  cat:'Vegetais' },
  { id:'f233',name:'Palmito Pupunha',         kcalPer100:42,  protPer100:1.8,  carbPer100:9.0,  fatPer100:0.6,  cat:'Vegetais' },
  { id:'f234',name:'Alcachofra Cozida',       kcalPer100:53,  protPer100:2.6,  carbPer100:11.8, fatPer100:0.4,  cat:'Vegetais' },
  { id:'f235',name:'Alho Poró Cozido',        kcalPer100:31,  protPer100:0.8,  carbPer100:7.3,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f236',name:'Alho Cru',               kcalPer100:149, protPer100:6.4,  carbPer100:33.1, fatPer100:0.5,  cat:'Vegetais' },
  { id:'f237',name:'Gengibre Cru',            kcalPer100:80,  protPer100:1.8,  carbPer100:18.0, fatPer100:0.7,  cat:'Vegetais' },
  { id:'f238',name:'Edamame (Soja Verde)',     kcalPer100:121, protPer100:11.9, carbPer100:8.9,  fatPer100:5.2,  cat:'Vegetais' },
  { id:'f239',name:'Rabanete Cru',            kcalPer100:16,  protPer100:0.7,  carbPer100:3.4,  fatPer100:0.1,  cat:'Vegetais' },
  { id:'f240',name:'Pimentão Vermelho',       kcalPer100:31,  protPer100:1.0,  carbPer100:6.0,  fatPer100:0.3,  cat:'Vegetais' },
  { id:'f241',name:'Pimentão Amarelo',        kcalPer100:27,  protPer100:1.0,  carbPer100:6.3,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f242',name:'Mandioquinha Cozida',     kcalPer100:103, protPer100:0.6,  carbPer100:25.0, fatPer100:0.3,  cat:'Vegetais' },
  { id:'f243',name:'Ervilha Torta Cozida',    kcalPer100:42,  protPer100:3.0,  carbPer100:7.6,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f244',name:'Lentilha Vermelha Cozida',kcalPer100:116, protPer100:9.0,  carbPer100:20.0, fatPer100:0.4,  cat:'Vegetais' },
  { id:'f245',name:'Tomate Cereja',           kcalPer100:22,  protPer100:1.0,  carbPer100:4.8,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f246',name:'Tofu Grelhado',           kcalPer100:144, protPer100:15.8, carbPer100:3.5,  fatPer100:8.7,  cat:'Vegetais' },
  { id:'f247',name:'Feijão Verde Cozido',     kcalPer100:34,  protPer100:2.0,  carbPer100:6.6,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f248',name:'Broto de Feijão',         kcalPer100:30,  protPer100:3.1,  carbPer100:5.9,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f249',name:'Milho Verde em Conserva', kcalPer100:96,  protPer100:3.4,  carbPer100:21.0, fatPer100:1.5,  cat:'Vegetais' },
  { id:'f250',name:'Couve de Bruxelas',       kcalPer100:36,  protPer100:2.6,  carbPer100:7.8,  fatPer100:0.3,  cat:'Vegetais' },

  // ── Frutas extras (tropicais e temperadas) ──
  { id:'f251',name:'Açaí (polpa)',            kcalPer100:247, protPer100:1.5,  carbPer100:6.1,  fatPer100:25.0, cat:'Frutas' },
  { id:'f252',name:'Cupuaçu',                kcalPer100:49,  protPer100:1.4,  carbPer100:9.4,  fatPer100:1.5,  cat:'Frutas' },
  { id:'f253',name:'Jabuticaba',             kcalPer100:58,  protPer100:0.7,  carbPer100:15.3, fatPer100:0.1,  cat:'Frutas' },
  { id:'f254',name:'Acerola',               kcalPer100:33,  protPer100:0.9,  carbPer100:7.1,  fatPer100:0.2,  cat:'Frutas' },
  { id:'f255',name:'Graviola',              kcalPer100:62,  protPer100:1.0,  carbPer100:16.0, fatPer100:0.3,  cat:'Frutas' },
  { id:'f256',name:'Pitanga',               kcalPer100:41,  protPer100:0.6,  carbPer100:9.9,  fatPer100:0.3,  cat:'Frutas' },
  { id:'f257',name:'Cajá',                  kcalPer100:43,  protPer100:0.7,  carbPer100:11.3, fatPer100:0.1,  cat:'Frutas' },
  { id:'f258',name:'Umbu',                  kcalPer100:44,  protPer100:0.5,  carbPer100:11.8, fatPer100:0.1,  cat:'Frutas' },
  { id:'f259',name:'Siriguela',             kcalPer100:67,  protPer100:0.6,  carbPer100:16.5, fatPer100:0.6,  cat:'Frutas' },
  { id:'f260',name:'Tamarindo',             kcalPer100:239, protPer100:2.8,  carbPer100:62.5, fatPer100:0.6,  cat:'Frutas' },
  { id:'f261',name:'Carambola',             kcalPer100:31,  protPer100:1.0,  carbPer100:6.7,  fatPer100:0.3,  cat:'Frutas' },
  { id:'f262',name:'Romã',                  kcalPer100:83,  protPer100:1.7,  carbPer100:18.7, fatPer100:1.2,  cat:'Frutas' },
  { id:'f263',name:'Tâmara',               kcalPer100:277, protPer100:1.8,  carbPer100:75.0, fatPer100:0.2,  cat:'Frutas' },
  { id:'f264',name:'Amora',                kcalPer100:43,  protPer100:1.4,  carbPer100:9.6,  fatPer100:0.5,  cat:'Frutas' },
  { id:'f265',name:'Framboesa',            kcalPer100:52,  protPer100:1.2,  carbPer100:11.9, fatPer100:0.7,  cat:'Frutas' },
  { id:'f266',name:'Mirtilo (Blueberry)',  kcalPer100:57,  protPer100:0.7,  carbPer100:14.5, fatPer100:0.3,  cat:'Frutas' },
  { id:'f267',name:'Lichia',               kcalPer100:66,  protPer100:0.8,  carbPer100:16.5, fatPer100:0.4,  cat:'Frutas' },
  { id:'f268',name:'Pitaya (Dragon Fruit)',kcalPer100:50,  protPer100:1.1,  carbPer100:11.0, fatPer100:0.4,  cat:'Frutas' },
  { id:'f269',name:'Caju (Fruta)',         kcalPer100:43,  protPer100:0.8,  carbPer100:10.3, fatPer100:0.3,  cat:'Frutas' },
  { id:'f270',name:'Banana-da-Terra Cozida',kcalPer100:122,protPer100:1.2, carbPer100:31.7, fatPer100:0.1,  cat:'Frutas' },
  { id:'f271',name:'Fruta-do-Conde',       kcalPer100:94,  protPer100:1.7,  carbPer100:23.6, fatPer100:0.5,  cat:'Frutas' },
  { id:'f272',name:'Jaca Madura',          kcalPer100:95,  protPer100:1.7,  carbPer100:23.2, fatPer100:0.6,  cat:'Frutas' },
  { id:'f273',name:'Coco Ralado Seco',     kcalPer100:660, protPer100:5.0,  carbPer100:24.0, fatPer100:64.5, cat:'Frutas' },
  { id:'f273b',name:'Maracujá Doce',       kcalPer100:81,  protPer100:1.5,  carbPer100:19.5, fatPer100:0.5,  cat:'Frutas' },

  // ── Laticínios / Gorduras / Oleaginosas extras ──
  { id:'f274',name:'Queijo Parmesão',       kcalPer100:431, protPer100:38.5, carbPer100:4.1,  fatPer100:29.7, cat:'Laticínios' },
  { id:'f275',name:'Queijo Cheddar',        kcalPer100:403, protPer100:24.9, carbPer100:1.3,  fatPer100:33.1, cat:'Laticínios' },
  { id:'f276',name:'Queijo Gouda',          kcalPer100:356, protPer100:25.0, carbPer100:2.2,  fatPer100:27.4, cat:'Laticínios' },
  { id:'f277',name:'Queijo Ricota',         kcalPer100:174, protPer100:11.3, carbPer100:3.0,  fatPer100:13.0, cat:'Laticínios' },
  { id:'f278',name:'Queijo Brie',           kcalPer100:334, protPer100:20.7, carbPer100:0.5,  fatPer100:27.7, cat:'Laticínios' },
  { id:'f279',name:'Queijo Provolone',      kcalPer100:352, protPer100:25.6, carbPer100:2.1,  fatPer100:26.6, cat:'Laticínios' },
  { id:'f280',name:'Leite em Pó Integral',  kcalPer100:496, protPer100:26.3, carbPer100:38.4, fatPer100:26.7, cat:'Laticínios' },
  { id:'f281',name:'Leite em Pó Desnatado', kcalPer100:357, protPer100:35.6, carbPer100:52.0, fatPer100:0.8,  cat:'Laticínios' },
  { id:'f282',name:'Iogurte Desnatado',     kcalPer100:38,  protPer100:4.0,  carbPer100:5.4,  fatPer100:0.2,  cat:'Laticínios' },
  { id:'f283',name:'Ghee (Manteiga Clarif)',kcalPer100:900, protPer100:0,    carbPer100:0,    fatPer100:100.0,cat:'Laticínios' },
  { id:'f284',name:'Óleo de Girassol',      kcalPer100:884, protPer100:0,    carbPer100:0,    fatPer100:100.0,cat:'Laticínios' },
  { id:'f285',name:'Óleo de Soja',          kcalPer100:884, protPer100:0,    carbPer100:0,    fatPer100:100.0,cat:'Laticínios' },
  { id:'f286',name:'Óleo de Canola',        kcalPer100:884, protPer100:0,    carbPer100:0,    fatPer100:100.0,cat:'Laticínios' },
  { id:'f287',name:'Margarina',             kcalPer100:581, protPer100:0.2,  carbPer100:0.4,  fatPer100:65.0, cat:'Laticínios' },
  { id:'f288',name:'Amendoim Torrado s/ Sal',kcalPer100:567,protPer100:25.3, carbPer100:21.4, fatPer100:46.1, cat:'Laticínios' },
  { id:'f289',name:'Pistache',              kcalPer100:562, protPer100:20.2, carbPer100:27.5, fatPer100:45.4, cat:'Laticínios' },
  { id:'f290',name:'Macadâmia',             kcalPer100:718, protPer100:7.9,  carbPer100:13.8, fatPer100:75.8, cat:'Laticínios' },
  { id:'f291',name:'Avelã',                kcalPer100:628, protPer100:14.9, carbPer100:16.7, fatPer100:60.8, cat:'Laticínios' },
  { id:'f292',name:'Gergelim (semente)',    kcalPer100:573, protPer100:17.7, carbPer100:23.5, fatPer100:49.7, cat:'Laticínios' },
  { id:'f293',name:'Leite de Coco (lata)',  kcalPer100:230, protPer100:2.3,  carbPer100:3.4,  fatPer100:23.8, cat:'Laticínios' },
  { id:'f294',name:'Tahine (pasta gergelim)',kcalPer100:595,protPer100:17.0, carbPer100:21.2, fatPer100:53.8, cat:'Laticínios' },
  { id:'f295',name:'Sementes de Abóbora',   kcalPer100:446, protPer100:18.5, carbPer100:53.8, fatPer100:19.4, cat:'Laticínios' },
  { id:'f296',name:'Sementes de Girassol',  kcalPer100:584, protPer100:20.8, carbPer100:20.0, fatPer100:51.5, cat:'Laticínios' },
  { id:'f297',name:'Pinhão Cozido',         kcalPer100:207, protPer100:5.5,  carbPer100:43.0, fatPer100:3.0,  cat:'Laticínios' },
  { id:'f298',name:'Noz Pecã',             kcalPer100:691, protPer100:9.2,  carbPer100:13.9, fatPer100:72.0, cat:'Laticínios' },
  { id:'f299',name:'Óleo de Milho',         kcalPer100:884, protPer100:0,    carbPer100:0,    fatPer100:100.0,cat:'Laticínios' },
  { id:'f299b',name:'Creme de Amendoim Integral',kcalPer100:610,protPer100:22.0,carbPer100:20.0,fatPer100:52.0,cat:'Laticínios' },

  // ── Pratos extras ──
  { id:'f300',name:'Moqueca de Peixe',      kcalPer100:120, protPer100:15.0, carbPer100:4.0,  fatPer100:5.0,  cat:'Pratos' },
  { id:'f301',name:'Moqueca de Camarão',    kcalPer100:130, protPer100:14.0, carbPer100:5.0,  fatPer100:6.0,  cat:'Pratos' },
  { id:'f302',name:'Vatapá',               kcalPer100:185, protPer100:9.0,  carbPer100:18.5, fatPer100:9.0,  cat:'Pratos' },
  { id:'f303',name:'Acarajé com Recheio',   kcalPer100:280, protPer100:10.0, carbPer100:25.0, fatPer100:17.0, cat:'Pratos' },
  { id:'f304',name:'Bobó de Camarão',       kcalPer100:170, protPer100:12.0, carbPer100:12.0, fatPer100:8.5,  cat:'Pratos' },
  { id:'f305',name:'Frango com Quiabo',     kcalPer100:145, protPer100:16.0, carbPer100:5.0,  fatPer100:7.0,  cat:'Pratos' },
  { id:'f306',name:'Arroz com Feijão',      kcalPer100:102, protPer100:4.5,  carbPer100:18.5, fatPer100:1.5,  cat:'Pratos' },
  { id:'f307',name:'Tutu de Feijão',        kcalPer100:120, protPer100:5.5,  carbPer100:17.0, fatPer100:3.5,  cat:'Pratos' },
  { id:'f308',name:'Virado à Paulista',     kcalPer100:165, protPer100:8.0,  carbPer100:21.0, fatPer100:5.5,  cat:'Pratos' },
  { id:'f309',name:'Caldo Verde',           kcalPer100:68,  protPer100:3.5,  carbPer100:7.5,  fatPer100:2.5,  cat:'Pratos' },
  { id:'f310',name:'Sopa de Legumes',       kcalPer100:52,  protPer100:2.0,  carbPer100:9.0,  fatPer100:1.0,  cat:'Pratos' },
  { id:'f311',name:'Bife Acebolado',        kcalPer100:245, protPer100:28.0, carbPer100:5.5,  fatPer100:12.5, cat:'Pratos' },
  { id:'f312',name:'Espetinho de Frango',   kcalPer100:168, protPer100:27.0, carbPer100:3.0,  fatPer100:5.5,  cat:'Pratos' },
  { id:'f313',name:'Espetinho de Carne',    kcalPer100:220, protPer100:25.0, carbPer100:1.0,  fatPer100:13.0, cat:'Pratos' },
  { id:'f314',name:'Mexido de Ovos',        kcalPer100:155, protPer100:10.0, carbPer100:5.0,  fatPer100:11.5, cat:'Pratos' },
  { id:'f315',name:'Peixe Assado ao Limão', kcalPer100:130, protPer100:22.0, carbPer100:1.0,  fatPer100:4.0,  cat:'Pratos' },
  { id:'f316',name:'Prato Fit Completo',    kcalPer100:175, protPer100:22.0, carbPer100:14.0, fatPer100:4.0,  cat:'Pratos' },
  { id:'f317',name:'Caldeirada de Peixe',   kcalPer100:118, protPer100:16.0, carbPer100:4.5,  fatPer100:4.0,  cat:'Pratos' },
  { id:'f318',name:'Lombo Assado',          kcalPer100:235, protPer100:28.0, carbPer100:0,    fatPer100:13.5, cat:'Pratos' },
  { id:'f319',name:'Frango ao Molho Tomate',kcalPer100:148, protPer100:19.0, carbPer100:5.5,  fatPer100:6.0,  cat:'Pratos' },
  { id:'f319b',name:'Buchada de Bode',      kcalPer100:158, protPer100:18.5, carbPer100:1.0,  fatPer100:9.0,  cat:'Pratos' },
  { id:'f319c',name:'Barreado',             kcalPer100:195, protPer100:21.0, carbPer100:2.0,  fatPer100:11.5, cat:'Pratos' },
  { id:'f319d',name:'Dobradinha',           kcalPer100:130, protPer100:15.0, carbPer100:5.0,  fatPer100:6.0,  cat:'Pratos' },
  { id:'f319e',name:'Galinhada Mineira',    kcalPer100:165, protPer100:18.0, carbPer100:7.0,  fatPer100:7.5,  cat:'Pratos' },
  { id:'f319f',name:'Rabada com Agrião',    kcalPer100:210, protPer100:22.0, carbPer100:2.5,  fatPer100:12.5, cat:'Pratos' },

  // ── Doces e Bebidas extras ──
  { id:'f320',name:'Café Preto sem Açúcar', kcalPer100:2,   protPer100:0.3,  carbPer100:0,    fatPer100:0,    cat:'Doces' },
  { id:'f321',name:'Café com Leite',        kcalPer100:38,  protPer100:1.5,  carbPer100:3.0,  fatPer100:2.0,  cat:'Doces' },
  { id:'f322',name:'Suco de Limão Natural', kcalPer100:23,  protPer100:0.4,  carbPer100:7.0,  fatPer100:0,    cat:'Doces' },
  { id:'f323',name:'Suco de Maracujá',      kcalPer100:70,  protPer100:2.0,  carbPer100:15.5, fatPer100:0.4,  cat:'Doces' },
  { id:'f324',name:'Suco de Abacaxi',       kcalPer100:48,  protPer100:0.4,  carbPer100:12.5, fatPer100:0.1,  cat:'Doces' },
  { id:'f325',name:'Vitamina de Morango',   kcalPer100:90,  protPer100:3.5,  carbPer100:15.0, fatPer100:2.0,  cat:'Doces' },
  { id:'f326',name:'Caldo de Cana',         kcalPer100:56,  protPer100:0.5,  carbPer100:14.0, fatPer100:0.1,  cat:'Doces' },
  { id:'f327',name:'Vinho Tinto Seco',      kcalPer100:85,  protPer100:0.1,  carbPer100:2.6,  fatPer100:0,    cat:'Doces' },
  { id:'f328',name:'Refrigerante Diet/Zero',kcalPer100:1,   protPer100:0,    carbPer100:0.1,  fatPer100:0,    cat:'Doces' },
  { id:'f329',name:'Refrigerante Guaraná',  kcalPer100:42,  protPer100:0,    carbPer100:10.5, fatPer100:0,    cat:'Doces' },
  { id:'f330',name:'Canjica Doce',          kcalPer100:178, protPer100:4.5,  carbPer100:35.0, fatPer100:2.5,  cat:'Doces' },
  { id:'f331',name:'Pamonha',              kcalPer100:210, protPer100:3.5,  carbPer100:36.0, fatPer100:6.5,  cat:'Doces' },
  { id:'f332',name:'Cocada',               kcalPer100:450, protPer100:3.5,  carbPer100:56.0, fatPer100:24.0, cat:'Doces' },
  { id:'f333',name:'Quindim',              kcalPer100:334, protPer100:7.0,  carbPer100:40.0, fatPer100:17.0, cat:'Doces' },
  { id:'f334',name:'Romeu e Julieta',      kcalPer100:280, protPer100:5.5,  carbPer100:48.0, fatPer100:8.0,  cat:'Doces' },
  { id:'f335',name:'Bananada',             kcalPer100:285, protPer100:0.5,  carbPer100:73.0, fatPer100:0.1,  cat:'Doces' },
  { id:'f336',name:'Rapadura',             kcalPer100:383, protPer100:0.3,  carbPer100:95.2, fatPer100:0.1,  cat:'Doces' },
  { id:'f337',name:'Doce de Leite',        kcalPer100:321, protPer100:6.9,  carbPer100:56.3, fatPer100:8.1,  cat:'Doces' },
  { id:'f338',name:'Bolo de Cenoura',      kcalPer100:350, protPer100:5.0,  carbPer100:55.0, fatPer100:12.0, cat:'Doces' },
  { id:'f339',name:'Bolo de Fubá',         kcalPer100:290, protPer100:6.5,  carbPer100:49.5, fatPer100:7.0,  cat:'Doces' },
  { id:'f340',name:'Torta de Limão',       kcalPer100:310, protPer100:4.5,  carbPer100:42.0, fatPer100:14.5, cat:'Doces' },
  { id:'f341',name:'Mousse de Maracujá',   kcalPer100:260, protPer100:4.0,  carbPer100:30.5, fatPer100:13.5, cat:'Doces' },
  { id:'f342',name:'Açúcar Mascavo',       kcalPer100:380, protPer100:0.1,  carbPer100:97.3, fatPer100:0.1,  cat:'Doces' },
  { id:'f343',name:'Doce de Coco',         kcalPer100:392, protPer100:3.0,  carbPer100:64.0, fatPer100:14.5, cat:'Doces' },
  { id:'f344',name:'Pé de Moleque',        kcalPer100:486, protPer100:15.0, carbPer100:47.5, fatPer100:28.0, cat:'Doces' },
  { id:'f345',name:'Curau de Milho',       kcalPer100:130, protPer100:2.5,  carbPer100:28.5, fatPer100:1.5,  cat:'Doces' },
  { id:'f346',name:'Suco de Manga',        kcalPer100:60,  protPer100:0.5,  carbPer100:15.0, fatPer100:0.3,  cat:'Doces' },
  { id:'f347',name:'Vitamina de Abacate',  kcalPer100:135, protPer100:2.5,  carbPer100:12.5, fatPer100:9.0,  cat:'Doces' },
  { id:'f348',name:'Limonada Suíça',       kcalPer100:95,  protPer100:0.5,  carbPer100:14.0, fatPer100:4.0,  cat:'Doces' },

  // ── Suplementos ──
  { id:'f350',name:'Creatina Monoidratada', kcalPer100:0,   protPer100:0,    carbPer100:0,    fatPer100:0,    cat:'Suplementos' },
  { id:'f351',name:'BCAA em Pó',           kcalPer100:20,  protPer100:5.0,  carbPer100:0,    fatPer100:0,    cat:'Suplementos' },
  { id:'f352',name:'Glutamina em Pó',      kcalPer100:0,   protPer100:0,    carbPer100:0,    fatPer100:0,    cat:'Suplementos' },
  { id:'f353',name:'Pré-Treino',           kcalPer100:15,  protPer100:1.5,  carbPer100:3.0,  fatPer100:0,    cat:'Suplementos' },
  { id:'f354',name:'Colágeno Hidrolisado', kcalPer100:35,  protPer100:9.0,  carbPer100:0,    fatPer100:0,    cat:'Suplementos' },
  { id:'f355',name:'Hipercalórico',        kcalPer100:380, protPer100:12.0, carbPer100:76.0, fatPer100:4.0,  cat:'Suplementos' },
  { id:'f356',name:'Maltodextrina',        kcalPer100:380, protPer100:0,    carbPer100:95.0, fatPer100:0,    cat:'Suplementos' },
  { id:'f357',name:'Dextrose',             kcalPer100:400, protPer100:0,    carbPer100:100.0,fatPer100:0,    cat:'Suplementos' },
  { id:'f358',name:'Caseína em Pó',        kcalPer100:375, protPer100:75.0, carbPer100:10.0, fatPer100:5.0,  cat:'Suplementos' },
  { id:'f359',name:'Termogênico',          kcalPer100:10,  protPer100:0,    carbPer100:2.5,  fatPer100:0,    cat:'Suplementos' },
  { id:'f360',name:'Whey Isolado',         kcalPer100:370, protPer100:90.0, carbPer100:2.0,  fatPer100:1.0,  cat:'Suplementos' },
  { id:'f361',name:'Whey Concentrado',     kcalPer100:380, protPer100:80.0, carbPer100:5.0,  fatPer100:2.0,  cat:'Suplementos' },
  { id:'f362',name:'Proteína Vegana (Ervilha)',kcalPer100:370,protPer100:80.0,carbPer100:6.0,fatPer100:3.0, cat:'Suplementos' },
  { id:'f363',name:'Óleo de Peixe (ômega 3)',kcalPer100:900,protPer100:0,  carbPer100:0,    fatPer100:100.0,cat:'Suplementos' },
  { id:'f364',name:'Vitamina C 1000mg',    kcalPer100:0,   protPer100:0,    carbPer100:0,    fatPer100:0,    cat:'Suplementos' },

  // ── Carnes Bovinas (cortes adicionais) ──
  { id:'f365',name:'Fraldinha Grelhada',    kcalPer100:218, protPer100:27.0, carbPer100:0,    fatPer100:12.0, cat:'Proteínas' },
  { id:'f366',name:'Coxão Mole Grelhado',   kcalPer100:195, protPer100:28.0, carbPer100:0,    fatPer100:9.0,  cat:'Proteínas' },
  { id:'f367',name:'Coxão Duro Cozido',     kcalPer100:185, protPer100:27.5, carbPer100:0,    fatPer100:8.5,  cat:'Proteínas' },
  { id:'f368',name:'Lagarto Cozido',        kcalPer100:170, protPer100:27.0, carbPer100:0,    fatPer100:6.5,  cat:'Proteínas' },
  { id:'f369',name:'Ponta de Agulha Cozida',kcalPer100:315, protPer100:22.0, carbPer100:0,    fatPer100:25.0, cat:'Proteínas' },
  { id:'f370',name:'Entrecôte Grelhado',    kcalPer100:268, protPer100:26.0, carbPer100:0,    fatPer100:18.0, cat:'Proteínas' },
  { id:'f371',name:'Língua Bovina Cozida',  kcalPer100:284, protPer100:24.0, carbPer100:0,    fatPer100:21.0, cat:'Proteínas' },
  { id:'f372',name:'Fígado de Frango',      kcalPer100:119, protPer100:16.9, carbPer100:0.9,  fatPer100:4.8,  cat:'Proteínas' },
  { id:'f373',name:'Moela de Frango Cozida',kcalPer100:125, protPer100:22.5, carbPer100:0,    fatPer100:3.5,  cat:'Proteínas' },
  { id:'f374',name:'Asa de Frango Assada',  kcalPer100:290, protPer100:27.0, carbPer100:0,    fatPer100:20.0, cat:'Proteínas' },
  { id:'f375',name:'Galinha Caipira Cozida',kcalPer100:218, protPer100:25.0, carbPer100:0,    fatPer100:13.0, cat:'Proteínas' },
  { id:'f376',name:'Cordeiro Pernil Assado',kcalPer100:282, protPer100:28.8, carbPer100:0,    fatPer100:18.0, cat:'Proteínas' },
  { id:'f377',name:'Costela de Cordeiro',   kcalPer100:340, protPer100:22.0, carbPer100:0,    fatPer100:28.0, cat:'Proteínas' },
  { id:'f378',name:'Calabresa Fatiada',     kcalPer100:380, protPer100:16.0, carbPer100:3.5,  fatPer100:34.0, cat:'Proteínas' },
  { id:'f379',name:'Salame Italiano',       kcalPer100:425, protPer100:21.0, carbPer100:2.0,  fatPer100:38.0, cat:'Proteínas' },
  { id:'f380',name:'Pepperoni',             kcalPer100:494, protPer100:21.3, carbPer100:1.2,  fatPer100:44.3, cat:'Proteínas' },
  { id:'f381',name:'Paio Cozido',           kcalPer100:320, protPer100:14.0, carbPer100:2.0,  fatPer100:29.0, cat:'Proteínas' },
  { id:'f382',name:'Nuggets de Frango',     kcalPer100:247, protPer100:15.0, carbPer100:16.0, fatPer100:13.0, cat:'Proteínas' },
  { id:'f383',name:'Hambúrguer Bovino Cru', kcalPer100:256, protPer100:18.0, carbPer100:0,    fatPer100:20.0, cat:'Proteínas' },
  { id:'f384',name:'Hambúrguer de Frango',  kcalPer100:200, protPer100:18.0, carbPer100:5.0,  fatPer100:12.0, cat:'Proteínas' },
  { id:'f385',name:'Pirarucu Assado',       kcalPer100:110, protPer100:22.0, carbPer100:0,    fatPer100:2.5,  cat:'Proteínas' },
  { id:'f386',name:'Tambaqui Assado',       kcalPer100:148, protPer100:22.0, carbPer100:0,    fatPer100:6.5,  cat:'Proteínas' },
  { id:'f387',name:'Tucunaré Assado',       kcalPer100:112, protPer100:22.0, carbPer100:0,    fatPer100:2.5,  cat:'Proteínas' },
  { id:'f388',name:'Tainha Grelhada',       kcalPer100:143, protPer100:20.0, carbPer100:0,    fatPer100:6.5,  cat:'Proteínas' },
  { id:'f389',name:'Badejo Cozido',         kcalPer100:100, protPer100:21.5, carbPer100:0,    fatPer100:1.5,  cat:'Proteínas' },
  { id:'f390',name:'Lagosta Cozida',        kcalPer100:112, protPer100:21.3, carbPer100:1.5,  fatPer100:1.5,  cat:'Proteínas' },
  { id:'f391',name:'Vieira Cozida',         kcalPer100:88,  protPer100:17.0, carbPer100:2.6,  fatPer100:0.8,  cat:'Proteínas' },
  { id:'f392',name:'Salmão Defumado',       kcalPer100:177, protPer100:18.3, carbPer100:0,    fatPer100:11.2, cat:'Proteínas' },
  { id:'f393',name:'Proteína de Soja Texturizada',kcalPer100:327,protPer100:52.0,carbPer100:28.0,fatPer100:1.0,cat:'Proteínas' },
  { id:'f394',name:'Steak de Soja Grelhado',kcalPer100:155, protPer100:18.0, carbPer100:10.0, fatPer100:4.5,  cat:'Proteínas' },
  { id:'f395',name:'Peito de Pato Assado',  kcalPer100:201, protPer100:23.5, carbPer100:0,    fatPer100:11.5, cat:'Proteínas' },
  { id:'f396',name:'Rim Bovino Cozido',     kcalPer100:137, protPer100:24.0, carbPer100:0.3,  fatPer100:4.0,  cat:'Proteínas' },

  // ── Laticínios adicionais ──
  { id:'f397',name:'Queijo Coalho Grelhado',kcalPer100:329, protPer100:23.5, carbPer100:0.5,  fatPer100:26.0, cat:'Laticínios' },
  { id:'f398',name:'Queijo Prato',          kcalPer100:368, protPer100:24.0, carbPer100:1.5,  fatPer100:29.5, cat:'Laticínios' },
  { id:'f399',name:'Queijo Gorgonzola',     kcalPer100:358, protPer100:21.4, carbPer100:2.3,  fatPer100:30.0, cat:'Laticínios' },
  { id:'f400',name:'Queijo Serrano',        kcalPer100:380, protPer100:25.0, carbPer100:1.5,  fatPer100:31.0, cat:'Laticínios' },
  { id:'f401',name:'Queijo Colonial',       kcalPer100:345, protPer100:22.0, carbPer100:2.0,  fatPer100:28.0, cat:'Laticínios' },
  { id:'f402',name:'Queijo Camembert',      kcalPer100:300, protPer100:19.8, carbPer100:0.5,  fatPer100:24.3, cat:'Laticínios' },
  { id:'f403',name:'Coalhada Fresca',       kcalPer100:90,  protPer100:4.5,  carbPer100:8.0,  fatPer100:4.0,  cat:'Laticínios' },
  { id:'f404',name:'Coalhada Seca',         kcalPer100:170, protPer100:12.0, carbPer100:5.0,  fatPer100:12.0, cat:'Laticínios' },
  { id:'f405',name:'Kefir de Leite',        kcalPer100:62,  protPer100:3.4,  carbPer100:4.7,  fatPer100:3.3,  cat:'Laticínios' },
  { id:'f406',name:'Nata',                  kcalPer100:326, protPer100:2.4,  carbPer100:3.1,  fatPer100:34.0, cat:'Laticínios' },
  { id:'f407',name:'Banha de Porco',        kcalPer100:898, protPer100:0,    carbPer100:0,    fatPer100:100.0,cat:'Laticínios' },
  { id:'f408',name:'Óleo de Dendê',         kcalPer100:884, protPer100:0,    carbPer100:0,    fatPer100:100.0,cat:'Laticínios' },
  { id:'f409',name:'Creme de Avelã (Nutella)',kcalPer100:539,protPer100:6.3, carbPer100:57.5, fatPer100:31.5, cat:'Laticínios' },
  { id:'f410',name:'Manteiga de Cacau',     kcalPer100:884, protPer100:0,    carbPer100:0,    fatPer100:100.0,cat:'Laticínios' },
  { id:'f411',name:'Iogurte Morango',       kcalPer100:89,  protPer100:3.5,  carbPer100:15.5, fatPer100:1.5,  cat:'Laticínios' },
  { id:'f412',name:'Bebida Láctea',         kcalPer100:65,  protPer100:2.5,  carbPer100:10.5, fatPer100:1.5,  cat:'Laticínios' },
  { id:'f413',name:'Sorvete de Baunilha',   kcalPer100:207, protPer100:3.5,  carbPer100:23.6, fatPer100:11.0, cat:'Laticínios' },
  { id:'f414',name:'Sorvete de Morango',    kcalPer100:192, protPer100:3.2,  carbPer100:24.5, fatPer100:9.5,  cat:'Laticínios' },

  // ── Pães, Massas e Cereais adicionais ──
  { id:'f415',name:'Pão de Batata',         kcalPer100:265, protPer100:8.5,  carbPer100:50.5, fatPer100:3.5,  cat:'Carboidratos' },
  { id:'f416',name:'Pão Australiano',       kcalPer100:250, protPer100:8.0,  carbPer100:46.5, fatPer100:3.0,  cat:'Carboidratos' },
  { id:'f417',name:'Broa de Milho',         kcalPer100:273, protPer100:5.5,  carbPer100:48.0, fatPer100:7.0,  cat:'Carboidratos' },
  { id:'f418',name:'Croissant',             kcalPer100:406, protPer100:8.2,  carbPer100:45.8, fatPer100:21.0, cat:'Carboidratos' },
  { id:'f419',name:'Bagel',                 kcalPer100:257, protPer100:9.8,  carbPer100:50.0, fatPer100:1.6,  cat:'Carboidratos' },
  { id:'f420',name:'Focaccia',              kcalPer100:270, protPer100:7.5,  carbPer100:43.0, fatPer100:7.5,  cat:'Carboidratos' },
  { id:'f421',name:'Pão Francês Integral',  kcalPer100:265, protPer100:9.0,  carbPer100:50.0, fatPer100:2.0,  cat:'Carboidratos' },
  { id:'f422',name:'Biscoito de Maisena',   kcalPer100:445, protPer100:6.5,  carbPer100:74.0, fatPer100:14.5, cat:'Carboidratos' },
  { id:'f423',name:'Biscoito Maria',        kcalPer100:428, protPer100:7.0,  carbPer100:72.0, fatPer100:13.0, cat:'Carboidratos' },
  { id:'f424',name:'Cream Cracker',         kcalPer100:444, protPer100:9.0,  carbPer100:72.0, fatPer100:14.0, cat:'Carboidratos' },
  { id:'f425',name:'Wafer Recheado',        kcalPer100:508, protPer100:5.5,  carbPer100:64.5, fatPer100:26.0, cat:'Carboidratos' },
  { id:'f426',name:'Macarrão Instantâneo Cozido',kcalPer100:140,protPer100:3.5,carbPer100:25.0,fatPer100:3.5,cat:'Carboidratos' },
  { id:'f427',name:'Capellini Cozido',      kcalPer100:145, protPer100:5.0,  carbPer100:29.5, fatPer100:0.6,  cat:'Carboidratos' },
  { id:'f428',name:'Fettuccine Cozido',     kcalPer100:157, protPer100:5.8,  carbPer100:30.5, fatPer100:1.0,  cat:'Carboidratos' },
  { id:'f429',name:'Farelo de Trigo',       kcalPer100:216, protPer100:15.6, carbPer100:64.5, fatPer100:4.2,  cat:'Carboidratos' },
  { id:'f430',name:'Farelo de Aveia',       kcalPer100:246, protPer100:17.3, carbPer100:66.2, fatPer100:7.0,  cat:'Carboidratos' },
  { id:'f431',name:'Amaranto Cozido',       kcalPer100:102, protPer100:3.8,  carbPer100:18.7, fatPer100:1.6,  cat:'Carboidratos' },
  { id:'f432',name:'Trigo Sarraceno Cozido',kcalPer100:92,  protPer100:3.4,  carbPer100:19.9, fatPer100:0.6,  cat:'Carboidratos' },
  { id:'f433',name:'Cevada Cozida',         kcalPer100:123, protPer100:2.3,  carbPer100:28.2, fatPer100:0.4,  cat:'Carboidratos' },
  { id:'f434',name:'Farinha de Amêndoas',   kcalPer100:571, protPer100:21.2, carbPer100:19.7, fatPer100:50.6, cat:'Carboidratos' },
  { id:'f435',name:'Farinha de Grão-de-Bico',kcalPer100:387,protPer100:22.3,carbPer100:57.8, fatPer100:6.7,  cat:'Carboidratos' },
  { id:'f436',name:'Fubá Cozido (Angu)',    kcalPer100:72,  protPer100:1.5,  carbPer100:15.5, fatPer100:0.3,  cat:'Carboidratos' },
  { id:'f437',name:'Amido de Milho (Maizena)',kcalPer100:381,protPer100:0.3, carbPer100:93.8, fatPer100:0.1,  cat:'Carboidratos' },
  { id:'f438',name:'Polvilho Doce',         kcalPer100:362, protPer100:0.2,  carbPer100:90.0, fatPer100:0.1,  cat:'Carboidratos' },
  { id:'f439',name:'Polvilho Azedo',        kcalPer100:356, protPer100:0.1,  carbPer100:88.5, fatPer100:0.1,  cat:'Carboidratos' },

  // ── Vegetais adicionais ──
  { id:'f440',name:'Cenoura Cozida',        kcalPer100:41,  protPer100:0.9,  carbPer100:9.6,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f441',name:'Brócolos Cru',          kcalPer100:34,  protPer100:2.8,  carbPer100:6.6,  fatPer100:0.4,  cat:'Vegetais' },
  { id:'f442',name:'Espinafre Cozido',      kcalPer100:23,  protPer100:3.0,  carbPer100:3.8,  fatPer100:0.3,  cat:'Vegetais' },
  { id:'f443',name:'Almeirão Cru',          kcalPer100:20,  protPer100:1.5,  carbPer100:2.5,  fatPer100:0.5,  cat:'Vegetais' },
  { id:'f444',name:'Chicória Crua',         kcalPer100:23,  protPer100:1.7,  carbPer100:4.7,  fatPer100:0.3,  cat:'Vegetais' },
  { id:'f445',name:'Escarola Crua',         kcalPer100:17,  protPer100:1.3,  carbPer100:3.4,  fatPer100:0.2,  cat:'Vegetais' },
  { id:'f446',name:'Mostarda Folha Crua',   kcalPer100:27,  protPer100:2.9,  carbPer100:4.7,  fatPer100:0.4,  cat:'Vegetais' },
  { id:'f447',name:'Taioba Cozida',         kcalPer100:32,  protPer100:3.5,  carbPer100:5.0,  fatPer100:0.5,  cat:'Vegetais' },
  { id:'f448',name:'Ora-pro-nóbis Cozida',  kcalPer100:68,  protPer100:3.5,  carbPer100:12.0, fatPer100:1.0,  cat:'Vegetais' },
  { id:'f449',name:'Maxixe Cozido',         kcalPer100:22,  protPer100:0.8,  carbPer100:5.0,  fatPer100:0.1,  cat:'Vegetais' },
  { id:'f450',name:'Cará Cozido',           kcalPer100:116, protPer100:1.6,  carbPer100:27.5, fatPer100:0.2,  cat:'Vegetais' },
  { id:'f451',name:'Tomate Seco (em óleo)', kcalPer100:258, protPer100:5.5,  carbPer100:23.5, fatPer100:16.0, cat:'Vegetais' },
  { id:'f452',name:'Azeitona Verde',        kcalPer100:145, protPer100:1.0,  carbPer100:3.8,  fatPer100:15.3, cat:'Vegetais' },
  { id:'f453',name:'Azeitona Preta',        kcalPer100:115, protPer100:0.8,  carbPer100:6.3,  fatPer100:10.7, cat:'Vegetais' },
  { id:'f454',name:'Pimenta-do-Reino Preta',kcalPer100:251, protPer100:10.4, carbPer100:63.9, fatPer100:3.3,  cat:'Vegetais' },
  { id:'f455',name:'Páprica Doce',          kcalPer100:282, protPer100:14.1, carbPer100:54.0, fatPer100:12.9, cat:'Vegetais' },
  { id:'f456',name:'Cúrcuma em Pó',         kcalPer100:312, protPer100:9.7,  carbPer100:67.1, fatPer100:3.3,  cat:'Vegetais' },
  { id:'f457',name:'Canela em Pó',          kcalPer100:247, protPer100:4.0,  carbPer100:80.6, fatPer100:1.2,  cat:'Vegetais' },
  { id:'f458',name:'Coentro Fresco',        kcalPer100:23,  protPer100:2.1,  carbPer100:3.7,  fatPer100:0.5,  cat:'Vegetais' },
  { id:'f459',name:'Salsa Fresca',          kcalPer100:36,  protPer100:3.0,  carbPer100:6.3,  fatPer100:0.8,  cat:'Vegetais' },
  { id:'f460',name:'Hortelã Fresca',        kcalPer100:70,  protPer100:3.8,  carbPer100:14.9, fatPer100:0.9,  cat:'Vegetais' },
  { id:'f461',name:'Erva-Mate (chá)',       kcalPer100:4,   protPer100:0.3,  carbPer100:0.5,  fatPer100:0,    cat:'Vegetais' },
  { id:'f462',name:'Feijão Branco Cozido',  kcalPer100:139, protPer100:9.7,  carbPer100:25.0, fatPer100:0.5,  cat:'Vegetais' },
  { id:'f463',name:'Feijão de Corda Cozido',kcalPer100:76,  protPer100:5.3,  carbPer100:13.5, fatPer100:0.4,  cat:'Vegetais' },
  { id:'f464',name:'Amendoim Cozido',       kcalPer100:318, protPer100:13.5, carbPer100:14.0, fatPer100:24.0, cat:'Vegetais' },
  { id:'f465',name:'Amendoim Cru',          kcalPer100:567, protPer100:25.8, carbPer100:16.1, fatPer100:49.2, cat:'Vegetais' },
  { id:'f466',name:'Lentilha Preta Cozida', kcalPer100:116, protPer100:9.0,  carbPer100:20.0, fatPer100:0.4,  cat:'Vegetais' },
  { id:'f467',name:'Feijão Manteiga Cozido',kcalPer100:115, protPer100:7.5,  carbPer100:20.5, fatPer100:0.4,  cat:'Vegetais' },
  { id:'f468',name:'Ervilha Seca Cozida',   kcalPer100:118, protPer100:8.3,  carbPer100:21.1, fatPer100:0.4,  cat:'Vegetais' },

  // ── Frutas brasileiras adicionais ──
  { id:'f469',name:'Sapoti',               kcalPer100:83,  protPer100:0.4,  carbPer100:20.0, fatPer100:1.1,  cat:'Frutas' },
  { id:'f470',name:'Mangaba',              kcalPer100:50,  protPer100:1.1,  carbPer100:10.5, fatPer100:0.7,  cat:'Frutas' },
  { id:'f471',name:'Murici',               kcalPer100:69,  protPer100:0.9,  carbPer100:17.0, fatPer100:0.5,  cat:'Frutas' },
  { id:'f472',name:'Pequi',                kcalPer100:186, protPer100:2.1,  carbPer100:14.0, fatPer100:13.7, cat:'Frutas' },
  { id:'f473',name:'Bacuri',               kcalPer100:77,  protPer100:1.3,  carbPer100:18.0, fatPer100:0.6,  cat:'Frutas' },
  { id:'f474',name:'Araçá',                kcalPer100:62,  protPer100:0.7,  carbPer100:16.0, fatPer100:0.4,  cat:'Frutas' },
  { id:'f475',name:'Ingá',                 kcalPer100:78,  protPer100:1.0,  carbPer100:18.5, fatPer100:0.3,  cat:'Frutas' },
  { id:'f476',name:'Maçã Fuji',            kcalPer100:56,  protPer100:0.3,  carbPer100:15.0, fatPer100:0.2,  cat:'Frutas' },
  { id:'f477',name:'Maçã Verde (Granny)',  kcalPer100:52,  protPer100:0.3,  carbPer100:13.8, fatPer100:0.2,  cat:'Frutas' },
  { id:'f478',name:'Uva Niágara',          kcalPer100:65,  protPer100:0.7,  carbPer100:16.5, fatPer100:0.3,  cat:'Frutas' },
  { id:'f479',name:'Uva Itália',           kcalPer100:69,  protPer100:0.7,  carbPer100:18.1, fatPer100:0.2,  cat:'Frutas' },
  { id:'f480',name:'Laranja Lima',         kcalPer100:37,  protPer100:0.9,  carbPer100:8.9,  fatPer100:0.1,  cat:'Frutas' },
  { id:'f481',name:'Tangerina Ponkan',     kcalPer100:43,  protPer100:0.8,  carbPer100:10.5, fatPer100:0.2,  cat:'Frutas' },
  { id:'f482',name:'Limão Siciliano',      kcalPer100:26,  protPer100:1.0,  carbPer100:8.2,  fatPer100:0.3,  cat:'Frutas' },
  { id:'f483',name:'Limão Cravo',          kcalPer100:31,  protPer100:1.1,  carbPer100:10.0, fatPer100:0.3,  cat:'Frutas' },
  { id:'f484',name:'Banana Prata',         kcalPer100:98,  protPer100:1.3,  carbPer100:25.7, fatPer100:0.1,  cat:'Frutas' },
  { id:'f485',name:'Banana Nanica',        kcalPer100:92,  protPer100:1.4,  carbPer100:24.0, fatPer100:0.2,  cat:'Frutas' },
  { id:'f486',name:'Melão Cantaloupe',     kcalPer100:36,  protPer100:0.9,  carbPer100:8.2,  fatPer100:0.2,  cat:'Frutas' },
  { id:'f487',name:'Ameixa Seca',          kcalPer100:240, protPer100:2.2,  carbPer100:63.9, fatPer100:0.4,  cat:'Frutas' },
  { id:'f488',name:'Uva Passa',            kcalPer100:299, protPer100:3.1,  carbPer100:79.2, fatPer100:0.5,  cat:'Frutas' },
  { id:'f489',name:'Figo Seco',            kcalPer100:249, protPer100:3.3,  carbPer100:63.9, fatPer100:0.9,  cat:'Frutas' },
  { id:'f490',name:'Cranberry Seco',       kcalPer100:308, protPer100:0.2,  carbPer100:82.5, fatPer100:1.1,  cat:'Frutas' },
  { id:'f491',name:'Maçã Desidratada',     kcalPer100:243, protPer100:0.9,  carbPer100:65.9, fatPer100:0.3,  cat:'Frutas' },
  { id:'f492',name:'Banana Desidratada',   kcalPer100:346, protPer100:3.9,  carbPer100:88.3, fatPer100:1.8,  cat:'Frutas' },

  // ── Pratos regionais e do cotidiano ──
  { id:'f493',name:'Canja de Galinha',     kcalPer100:58,  protPer100:4.5,  carbPer100:5.5,  fatPer100:2.0,  cat:'Pratos' },
  { id:'f494',name:'Sopa de Feijão',       kcalPer100:65,  protPer100:3.5,  carbPer100:9.0,  fatPer100:1.5,  cat:'Pratos' },
  { id:'f495',name:'Sopa de Lentilha',     kcalPer100:70,  protPer100:4.5,  carbPer100:11.0, fatPer100:1.0,  cat:'Pratos' },
  { id:'f496',name:'Sarapatel',            kcalPer100:180, protPer100:16.5, carbPer100:3.0,  fatPer100:11.5, cat:'Pratos' },
  { id:'f497',name:'Mocotó',               kcalPer100:88,  protPer100:8.5,  carbPer100:0.5,  fatPer100:5.5,  cat:'Pratos' },
  { id:'f498',name:'Caruru Baiano',        kcalPer100:140, protPer100:5.5,  carbPer100:8.0,  fatPer100:10.0, cat:'Pratos' },
  { id:'f499',name:'Feijão Tropeiro',      kcalPer100:178, protPer100:8.5,  carbPer100:22.0, fatPer100:6.5,  cat:'Pratos' },
  { id:'f500',name:'Arroz Carreteiro',     kcalPer100:162, protPer100:9.5,  carbPer100:18.5, fatPer100:5.5,  cat:'Pratos' },
  { id:'f501',name:'Macarrão ao Molho Branco',kcalPer100:165,protPer100:5.5,carbPer100:22.0,fatPer100:6.5, cat:'Pratos' },
  { id:'f502',name:'Macarrão Alho e Azeite',kcalPer100:195,protPer100:5.5, carbPer100:26.0, fatPer100:8.5,  cat:'Pratos' },
  { id:'f503',name:'Strogonoff de Carne',  kcalPer100:185, protPer100:13.0, carbPer100:8.0,  fatPer100:12.0, cat:'Pratos' },
  { id:'f504',name:'Frango ao Curry',      kcalPer100:148, protPer100:16.0, carbPer100:6.0,  fatPer100:7.0,  cat:'Pratos' },
  { id:'f505',name:'Cachorro-Quente',      kcalPer100:258, protPer100:10.0, carbPer100:28.0, fatPer100:12.5, cat:'Pratos' },
  { id:'f506',name:'X-Burguer',            kcalPer100:268, protPer100:14.5, carbPer100:26.0, fatPer100:12.0, cat:'Pratos' },
  { id:'f507',name:'X-Tudo',               kcalPer100:320, protPer100:16.5, carbPer100:28.0, fatPer100:16.5, cat:'Pratos' },
  { id:'f508',name:'Pizza Calabresa (fatia)',kcalPer100:270,protPer100:12.0,carbPer100:32.0, fatPer100:10.5, cat:'Pratos' },
  { id:'f509',name:'Pizza 4 Queijos (fatia)',kcalPer100:290,protPer100:14.5,carbPer100:29.0, fatPer100:13.0, cat:'Pratos' },
  { id:'f510',name:'Caldinho de Feijão',   kcalPer100:55,  protPer100:3.0,  carbPer100:7.5,  fatPer100:1.5,  cat:'Pratos' },
  { id:'f511',name:'Cozido Brasileiro',    kcalPer100:148, protPer100:10.5, carbPer100:12.0, fatPer100:6.0,  cat:'Pratos' },
  { id:'f512',name:'Panqueca Salgada (frango)',kcalPer100:178,protPer100:10.5,carbPer100:17.0,fatPer100:8.0,cat:'Pratos' },
  { id:'f513',name:'Torta de Frango',      kcalPer100:245, protPer100:11.0, carbPer100:25.0, fatPer100:11.5, cat:'Pratos' },
  { id:'f514',name:'Torta de Palmito',     kcalPer100:220, protPer100:6.5,  carbPer100:28.5, fatPer100:9.5,  cat:'Pratos' },
  { id:'f515',name:'Frango Recheado Assado',kcalPer100:195,protPer100:24.5, carbPer100:3.5,  fatPer100:9.5,  cat:'Pratos' },
  { id:'f516',name:'Tacacá',               kcalPer100:40,  protPer100:2.5,  carbPer100:6.0,  fatPer100:0.8,  cat:'Pratos' },
  { id:'f517',name:'Batata Palha',         kcalPer100:527, protPer100:5.0,  carbPer100:55.0, fatPer100:33.0, cat:'Pratos' },
  { id:'f518',name:'Coxão Mole Ensopado',  kcalPer100:165, protPer100:20.5, carbPer100:3.5,  fatPer100:8.0,  cat:'Pratos' },
  { id:'f519',name:'Peixe Frito (genérico)',kcalPer100:235,protPer100:20.0, carbPer100:8.5,  fatPer100:14.0, cat:'Pratos' },
  { id:'f520',name:'Frango Frito',         kcalPer100:285, protPer100:23.0, carbPer100:10.5, fatPer100:17.0, cat:'Pratos' },

  // ── Condimentos, Molhos e Temperos ──
  { id:'f521',name:'Maionese',             kcalPer100:718, protPer100:1.2,  carbPer100:1.0,  fatPer100:80.0, cat:'Laticínios' },
  { id:'f522',name:'Maionese Light',       kcalPer100:274, protPer100:1.0,  carbPer100:9.5,  fatPer100:27.0, cat:'Laticínios' },
  { id:'f523',name:'Ketchup',              kcalPer100:112, protPer100:1.5,  carbPer100:27.3, fatPer100:0.1,  cat:'Doces' },
  { id:'f524',name:'Mostarda Amarela',     kcalPer100:66,  protPer100:4.4,  carbPer100:5.8,  fatPer100:3.3,  cat:'Doces' },
  { id:'f525',name:'Mostarda Dijon',       kcalPer100:66,  protPer100:4.0,  carbPer100:5.5,  fatPer100:4.0,  cat:'Doces' },
  { id:'f526',name:'Molho Shoyu',          kcalPer100:53,  protPer100:8.1,  carbPer100:4.9,  fatPer100:0,    cat:'Doces' },
  { id:'f527',name:'Molho Inglês',         kcalPer100:78,  protPer100:2.0,  carbPer100:19.5, fatPer100:0.1,  cat:'Doces' },
  { id:'f528',name:'Molho Barbecue',       kcalPer100:166, protPer100:1.5,  carbPer100:40.5, fatPer100:0.5,  cat:'Doces' },
  { id:'f529',name:'Molho de Pimenta',     kcalPer100:27,  protPer100:1.5,  carbPer100:5.5,  fatPer100:0.3,  cat:'Doces' },
  { id:'f530',name:'Vinagre de Maçã',      kcalPer100:22,  protPer100:0,    carbPer100:0.9,  fatPer100:0,    cat:'Doces' },
  { id:'f531',name:'Molho de Alho c/ Azeite',kcalPer100:595,protPer100:2.5,carbPer100:8.0,  fatPer100:62.0, cat:'Doces' },
  { id:'f532',name:'Chimichurri',          kcalPer100:187, protPer100:2.5,  carbPer100:10.0, fatPer100:16.0, cat:'Doces' },
  { id:'f533',name:'Manteiga de Amendoim s/ Açúcar',kcalPer100:600,protPer100:25.0,carbPer100:15.0,fatPer100:52.0,cat:'Laticínios' },

  // ── Doces e Sobremesas adicionais ──
  { id:'f534',name:'Cheesecake',           kcalPer100:321, protPer100:5.5,  carbPer100:26.0, fatPer100:22.5, cat:'Doces' },
  { id:'f535',name:'Torta de Maçã',        kcalPer100:265, protPer100:2.5,  carbPer100:37.0, fatPer100:12.5, cat:'Doces' },
  { id:'f536',name:'Pão de Mel',           kcalPer100:376, protPer100:5.5,  carbPer100:63.5, fatPer100:12.5, cat:'Doces' },
  { id:'f537',name:'Bolo Prestígio',       kcalPer100:415, protPer100:4.5,  carbPer100:52.0, fatPer100:22.0, cat:'Doces' },
  { id:'f538',name:'Bolo de Rolo',         kcalPer100:390, protPer100:5.0,  carbPer100:60.0, fatPer100:16.0, cat:'Doces' },
  { id:'f539',name:'Caju Doce',            kcalPer100:248, protPer100:1.5,  carbPer100:62.5, fatPer100:0.3,  cat:'Doces' },
  { id:'f540',name:'Bolo de Maçã',         kcalPer100:270, protPer100:4.5,  carbPer100:44.0, fatPer100:9.0,  cat:'Doces' },
  { id:'f541',name:'Sonho (Bomba)',        kcalPer100:350, protPer100:6.0,  carbPer100:42.0, fatPer100:18.0, cat:'Doces' },
  { id:'f542',name:'Gelatina Comum',       kcalPer100:80,  protPer100:1.7,  carbPer100:19.0, fatPer100:0,    cat:'Doces' },
  { id:'f543',name:'Gelatina Diet',        kcalPer100:15,  protPer100:1.6,  carbPer100:2.0,  fatPer100:0,    cat:'Doces' },
  { id:'f544',name:'Picolé de Fruta',      kcalPer100:78,  protPer100:0.5,  carbPer100:19.5, fatPer100:0.1,  cat:'Doces' },
  { id:'f545',name:'Picolé Cremoso',       kcalPer100:175, protPer100:2.5,  carbPer100:20.5, fatPer100:9.5,  cat:'Doces' },
  { id:'f546',name:'Alfajor',              kcalPer100:420, protPer100:5.5,  carbPer100:55.0, fatPer100:20.5, cat:'Doces' },
  { id:'f547',name:'Creme de Papaya',      kcalPer100:122, protPer100:1.5,  carbPer100:15.0, fatPer100:6.5,  cat:'Doces' },
  { id:'f548',name:'Arroz Doce',           kcalPer100:155, protPer100:3.5,  carbPer100:31.5, fatPer100:2.0,  cat:'Doces' },
  { id:'f549',name:'Manjar de Coco',       kcalPer100:145, protPer100:3.0,  carbPer100:23.5, fatPer100:5.0,  cat:'Doces' },
  { id:'f550',name:'Musse de Maracujá',    kcalPer100:240, protPer100:4.0,  carbPer100:28.5, fatPer100:13.0, cat:'Doces' },
  { id:'f551',name:'Pavê de Chocolate',    kcalPer100:330, protPer100:5.5,  carbPer100:42.0, fatPer100:16.5, cat:'Doces' },

  // ── Bebidas adicionais ──
  { id:'f552',name:'Cappuccino com Leite',  kcalPer100:52,  protPer100:2.5,  carbPer100:5.5,  fatPer100:2.5,  cat:'Doces' },
  { id:'f553',name:'Achocolatado Líquido',  kcalPer100:82,  protPer100:3.2,  carbPer100:14.5, fatPer100:1.8,  cat:'Doces' },
  { id:'f554',name:'Yakult (leite fermentado)',kcalPer100:66,protPer100:2.6, carbPer100:14.8, fatPer100:0,    cat:'Doces' },
  { id:'f555',name:'Kombucha',              kcalPer100:16,  protPer100:0,    carbPer100:3.8,  fatPer100:0,    cat:'Doces' },
  { id:'f556',name:'Chá Verde (sem açúcar)',kcalPer100:1,   protPer100:0,    carbPer100:0.2,  fatPer100:0,    cat:'Doces' },
  { id:'f557',name:'Chá de Camomila',       kcalPer100:1,   protPer100:0,    carbPer100:0.2,  fatPer100:0,    cat:'Doces' },
  { id:'f558',name:'Chá Mate Gelado',       kcalPer100:22,  protPer100:0,    carbPer100:5.5,  fatPer100:0,    cat:'Doces' },
  { id:'f559',name:'Suco de Cenoura Natural',kcalPer100:40, protPer100:0.9,  carbPer100:9.3,  fatPer100:0.2,  cat:'Doces' },
  { id:'f560',name:'Suco de Beterraba',     kcalPer100:43,  protPer100:1.6,  carbPer100:9.9,  fatPer100:0.2,  cat:'Doces' },
  { id:'f561',name:'Smoothie Verde (couve+maçã)',kcalPer100:38,protPer100:1.0,carbPer100:8.5, fatPer100:0.3,  cat:'Doces' },
  { id:'f562',name:'Limonada c/ Gengibre',  kcalPer100:30,  protPer100:0.2,  carbPer100:7.5,  fatPer100:0,    cat:'Doces' },
  { id:'f563',name:'Suco de Acerola',       kcalPer100:28,  protPer100:0.5,  carbPer100:6.5,  fatPer100:0.2,  cat:'Doces' },
  { id:'f564',name:'Água Saborizada',       kcalPer100:12,  protPer100:0,    carbPer100:3.0,  fatPer100:0,    cat:'Doces' },
  { id:'f565',name:'Vinho Branco Seco',     kcalPer100:82,  protPer100:0.1,  carbPer100:2.6,  fatPer100:0,    cat:'Doces' },
  { id:'f566',name:'Whisky/Destilado',      kcalPer100:250, protPer100:0,    carbPer100:0,    fatPer100:0,    cat:'Doces' },
  { id:'f567',name:'Cerveja sem Álcool',    kcalPer100:22,  protPer100:0.7,  carbPer100:4.5,  fatPer100:0,    cat:'Doces' },
  { id:'f568',name:'Refrigerante Limão',    kcalPer100:40,  protPer100:0,    carbPer100:10.0, fatPer100:0,    cat:'Doces' },
  { id:'f569',name:'Suco de Uva Branca',    kcalPer100:58,  protPer100:0.3,  carbPer100:14.5, fatPer100:0,    cat:'Doces' },

  // ── Suplementos adicionais ──
  { id:'f570',name:'ZMA (Zinco/Magnésio)',  kcalPer100:0,   protPer100:0,    carbPer100:0,    fatPer100:0,    cat:'Suplementos' },
  { id:'f571',name:'Vitamina D3',           kcalPer100:0,   protPer100:0,    carbPer100:0,    fatPer100:0,    cat:'Suplementos' },
  { id:'f572',name:'Multivitamínico',       kcalPer100:0,   protPer100:0,    carbPer100:0,    fatPer100:0,    cat:'Suplementos' },
  { id:'f573',name:'Spirulina em Pó',       kcalPer100:290, protPer100:57.5, carbPer100:23.9, fatPer100:7.7,  cat:'Suplementos' },
  { id:'f574',name:'Ashwagandha',           kcalPer100:245, protPer100:3.9,  carbPer100:49.9, fatPer100:0.3,  cat:'Suplementos' },
  { id:'f575',name:'Whey Hidrolisado',      kcalPer100:380, protPer100:93.0, carbPer100:1.5,  fatPer100:0.5,  cat:'Suplementos' },
  { id:'f576',name:'Arginina em Pó',        kcalPer100:0,   protPer100:0,    carbPer100:0,    fatPer100:0,    cat:'Suplementos' },
  { id:'f577',name:'Beta-Alanina',          kcalPer100:0,   protPer100:0,    carbPer100:0,    fatPer100:0,    cat:'Suplementos' },
  { id:'f578',name:'Cafeína Anidra',        kcalPer100:0,   protPer100:0,    carbPer100:0,    fatPer100:0,    cat:'Suplementos' },
  { id:'f579',name:'Palatinose',            kcalPer100:390, protPer100:0,    carbPer100:97.0, fatPer100:0,    cat:'Suplementos' },
  { id:'f580',name:'Waxy Maize',            kcalPer100:380, protPer100:0,    carbPer100:95.0, fatPer100:0,    cat:'Suplementos' },
];

const getMonday = (d) => {
  const dt = new Date(d); dt.setHours(0,0,0,0);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day + (day===0 ? -6 : 1));
  return dt;
};

// ─── PROGRESS ANALYSIS ────────────────────────────────────────────────────────
const generateAnalysis = (user, treinosLog, historico, caloriasLog, aguaGoalLog, currentStreak, maxStreak) => {
  const totalTreinos = (treinosLog||[]).length;
  const parts = [];
  const last30 = new Date(); last30.setDate(last30.getDate() - 30);
  const treinos30 = (treinosLog||[]).filter(d => new Date(d) >= last30).length;
  const pesoInicial = historico?.[0]?.peso || parseFloat(user.peso);
  const pesoAtual   = historico?.[historico.length - 1]?.peso || parseFloat(user.peso);
  const diffPeso    = parseFloat((pesoAtual - pesoInicial).toFixed(1));
  const hydSuccess  = (aguaGoalLog||[]).length;

  if (totalTreinos === 0) return 'Realize seu primeiro treino para ver a análise de progresso aqui! 💪';

  if (treinos30 >= 20)      parts.push(`Nos últimos 30 dias você treinou ${treinos30} vezes — ritmo excelente!`);
  else if (treinos30 >= 12) parts.push(`Você treinou ${treinos30} vezes nos últimos 30 dias — bom progresso!`);
  else if (treinos30 > 0)   parts.push(`Você treinou ${treinos30} vezes nos últimos 30 dias — aumente a frequência para melhores resultados.`);

  if (Math.abs(diffPeso) >= 0.5) {
    if (user.objetivo === 'Emagrecimento' && diffPeso < 0)
      parts.push(`Você perdeu ${Math.abs(diffPeso).toFixed(1)}kg desde o início — continue focado!`);
    else if (user.objetivo === 'Ganho de Massa' && diffPeso > 0)
      parts.push(`Você ganhou ${diffPeso.toFixed(1)}kg de massa — evolução positiva!`);
    else if (diffPeso !== 0)
      parts.push(`Seu peso variou ${Math.abs(diffPeso).toFixed(1)}kg desde o início.`);
  }

  if (currentStreak >= 7)      parts.push(`Sua sequência de ${currentStreak} dias mostra comprometimento real! 🔥`);
  else if (maxStreak >= 3)     parts.push(`Sua maior sequência foi de ${maxStreak} dias — tente superar esse recorde!`);

  if (hydSuccess >= 14)        parts.push(`Você atingiu a meta de hidratação ${hydSuccess} vezes — hábito excelente!`);
  else if (hydSuccess > 0)     parts.push(`Você atingiu a meta de água ${hydSuccess} vez(es) — tente manter consistência!`);

  if (parts.length === 0) parts.push('Continue treinando — os dados aparecerão aqui conforme você avança!');
  return parts.join(' ');
};

// ─── RECEITAS FITNESS ─────────────────────────────────────────────────────────
const RECEITAS_FITNESS = [
  { id:'r1', nome:'Omelete Proteico', cat:'Café da Manhã', tempo:'10 min', kcal:310, prot:28, carb:4, fat:20,
    ingredientes:['3 ovos inteiros','50g queijo cottage','1 tomate picado','Sal e orégano'],
    preparo:'Bata os ovos, adicione os demais ingredientes e cozinhe em frigideira antiaderente por 4 min de cada lado.' },
  { id:'r2', nome:'Panqueca de Aveia e Banana', cat:'Café da Manhã', tempo:'15 min', kcal:290, prot:12, carb:45, fat:7,
    ingredientes:['80g aveia em flocos','2 ovos','1 banana madura','Canela a gosto'],
    preparo:'Amasse a banana, misture com ovos e aveia. Faça panquecas numa frigideira untada em fogo médio.' },
  { id:'r3', nome:'Bowl de Açaí Fit', cat:'Café da Manhã', tempo:'5 min', kcal:380, prot:9, carb:52, fat:16,
    ingredientes:['200g polpa de açaí sem açúcar','1 banana','30g granola','Mel a gosto'],
    preparo:'Bata o açaí com meia banana. Sirva na tigela, adicione granola, banana fatiada e mel.' },
  { id:'r4', nome:'Vitamina de Whey e Banana', cat:'Pré-Treino', tempo:'5 min', kcal:360, prot:32, carb:45, fat:4,
    ingredientes:['30g whey protein (baunilha)','2 bananas','200ml leite desnatado','Canela a gosto'],
    preparo:'Bata tudo no liquidificador. Consuma 30–45 min antes do treino.' },
  { id:'r5', nome:'Frango Grelhado com Legumes', cat:'Almoço', tempo:'25 min', kcal:320, prot:42, carb:18, fat:8,
    ingredientes:['200g peito de frango','1 abobrinha','1 cenoura','Azeite, alho e temperos'],
    preparo:'Tempere o frango. Grelhe em frigideira 6 min de cada lado. Refogue os legumes em azeite com alho.' },
  { id:'r6', nome:'Arroz Integral com Atum', cat:'Almoço', tempo:'30 min', kcal:385, prot:28, carb:48, fat:6,
    ingredientes:['150g arroz integral cozido','1 lata de atum','½ cebola','Salsinha e limão'],
    preparo:'Misture o atum escorrido com arroz quente. Adicione cebola picada, salsinha e suco de limão.' },
  { id:'r7', nome:'Salada de Grão-de-Bico', cat:'Almoço', tempo:'10 min', kcal:270, prot:12, carb:35, fat:9,
    ingredientes:['200g grão-de-bico cozido','1 tomate','½ pepino','Azeite, limão, orégano'],
    preparo:'Misture todos os ingredientes. Tempere com azeite, limão e orégano. Sirva frio.' },
  { id:'r8', nome:'Shake Pós-Treino', cat:'Pós-Treino', tempo:'3 min', kcal:410, prot:35, carb:55, fat:4,
    ingredientes:['30g whey protein','1 banana','200ml leite desnatado','20g dextrose','Gelo'],
    preparo:'Bata no liquidificador. Consuma em até 30 min após o treino.' },
  { id:'r9', nome:'Frango Assado com Batata Doce', cat:'Jantar', tempo:'45 min', kcal:450, prot:44, carb:40, fat:10,
    ingredientes:['200g peito de frango','300g batata doce','Azeite, alho, ervas','Limão'],
    preparo:'Tempere o frango. Asse a 200°C por 35 min. Cozinhe a batata doce e tempere com azeite e ervas.' },
  { id:'r10', nome:'Tapioca Proteica', cat:'Lanche', tempo:'10 min', kcal:280, prot:20, carb:32, fat:8,
    ingredientes:['50g tapioca','2 claras','50g frango desfiado temperado','Queijo cottage'],
    preparo:'Misture tapioca e claras. Faça a panqueca em frigideira antiaderente. Recheie com frango e cottage.' },
  { id:'r11', nome:'Crepioca Fitness', cat:'Lanche', tempo:'8 min', kcal:240, prot:18, carb:22, fat:7,
    ingredientes:['2 ovos','3 colheres de tapioca','Recheio: atum ou frango desfiado'],
    preparo:'Bata ovos e tapioca. Leve à frigideira antiaderente. Recheie e dobre ao meio.' },
  { id:'r12', nome:'Ceviche Fit de Tilápia', cat:'Jantar', tempo:'20 min', kcal:200, prot:30, carb:10, fat:4,
    ingredientes:['200g filé de tilápia cru','Suco de 3 limões','1 tomate','½ cebola roxa','Coentro'],
    preparo:'Corte o peixe em cubos. Misture com limão, sal e leve à geladeira por 15 min. Adicione demais ingredientes.' },
  { id:'r13', nome:'Overnight Oats Proteico', cat:'Café da Manhã', tempo:'5 min + geladeira', kcal:350, prot:22, carb:48, fat:6,
    ingredientes:['60g aveia','200ml leite desnatado','1 scoop whey','Frutas vermelhas'],
    preparo:'Misture aveia, leite e whey. Deixe na geladeira por 8 horas. Sirva com frutas vermelhas.' },
  { id:'r14', nome:'Wrap de Frango Fit', cat:'Almoço', tempo:'15 min', kcal:380, prot:35, carb:32, fat:9,
    ingredientes:['1 wrap integral','150g frango grelhado','Alface, tomate, queijo cottage','Mostarda'],
    preparo:'Monte o wrap com todos os ingredientes. Enrole firmemente e sirva cortado ao meio.' },
  { id:'r15', nome:'Bowl de Proteína Vegana', cat:'Almoço', tempo:'20 min', kcal:340, prot:18, carb:45, fat:8,
    ingredientes:['150g lentilha cozida','100g edamame','Arroz integral','Molho tahine e limão'],
    preparo:'Monte o bowl com lentilha, edamame e arroz. Regue com molho de tahine e limão.' },
  { id:'r16', nome:'Salmão Grelhado com Quinoa', cat:'Jantar', tempo:'20 min', kcal:420, prot:38, carb:30, fat:14,
    ingredientes:['150g salmão','100g quinoa cozida','Brócolis no vapor','Limão e ervas'],
    preparo:'Grelhe o salmão 4 min de cada lado. Sirva com quinoa e brócolis temperados com limão.' },
  { id:'r17', nome:'Iogurte com Frutas e Granola', cat:'Lanche', tempo:'3 min', kcal:280, prot:12, carb:40, fat:6,
    ingredientes:['200g iogurte grego natural','30g granola','Morango e banana fatiados','Mel'],
    preparo:'Monte em camadas: iogurte, frutas, granola e mel. Sirva gelado.' },
  { id:'r18', nome:'Coxa de Frango no Forno', cat:'Jantar', tempo:'40 min', kcal:380, prot:32, carb:3, fat:27,
    ingredientes:['2 coxas de frango s/ pele','Alho, limão, ervas','Páprica defumada','Azeite'],
    preparo:'Tempere o frango com todos ingredientes. Asse a 200°C por 35 min.' },
  { id:'r19', nome:'Panela de Batata Doce e Frango', cat:'Almoço', tempo:'30 min', kcal:395, prot:38, carb:38, fat:8,
    ingredientes:['200g frango em cubos','400g batata doce','Caldo de legumes','Temperos'],
    preparo:'Refogue o frango. Adicione batata doce em cubos e caldo. Cozinhe até amaciar.' },
  { id:'r20', nome:'Pudim de Chia com Leite de Coco', cat:'Sobremesa Fit', tempo:'5 min + 2h', kcal:220, prot:5, carb:20, fat:13,
    ingredientes:['3 colheres de chia','200ml leite de coco','Manga picada','Mel'],
    preparo:'Misture chia e leite de coco. Geladeira 2 horas. Sirva com manga e mel.' },
  { id:'r21', nome:'Mousse de Proteína de Chocolate', cat:'Sobremesa Fit', tempo:'10 min', kcal:190, prot:20, carb:15, fat:4,
    ingredientes:['1 scoop whey chocolate','200g iogurte grego','1 colher cacau em pó','Adoçante'],
    preparo:'Bata tudo na batedeira até espuma firme. Leve à geladeira por 30 min.' },
  { id:'r22', nome:'Arroz de Forno Fitness', cat:'Almoço', tempo:'35 min', kcal:320, prot:25, carb:30, fat:10,
    ingredientes:['200g arroz integral cozido','150g frango desfiado','Milho, cenoura','Queijo mussarela light'],
    preparo:'Misture todos ingredientes. Coloque em refratário, cubra com queijo. Asse 180°C por 20 min.' },
  { id:'r23', nome:'Sopa Detox Verde', cat:'Jantar', tempo:'25 min', kcal:130, prot:7, carb:18, fat:3,
    ingredientes:['Brócolis, espinafre, abobrinha','Caldo de legumes','Alho, cebola','Gengibre'],
    preparo:'Refogue alho e cebola. Adicione legumes e caldo. Cozinhe e bata no liquidificador.' },
  { id:'r24', nome:'Bolo de Banana Fit', cat:'Lanche', tempo:'40 min', kcal:185, prot:6, carb:30, fat:5,
    ingredientes:['3 bananas maduras','2 ovos','80g aveia','Canela, fermento sem glúten'],
    preparo:'Amasse bananas, misture ovos e aveia. Leve ao forno 180°C por 30 min.' },
  { id:'r25', nome:'Marmita Fit Semanal', cat:'Almoço', tempo:'60 min', kcal:420, prot:40, carb:35, fat:12,
    ingredientes:['300g peito de frango','Arroz integral','Brócolis','Batata doce','Azeite e temperos'],
    preparo:'Prepare tudo separado. Monte marmitas em recipientes. Guarde na geladeira por até 4 dias.' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const isPositiveNum = (v) => v !== '' && !isNaN(Number(v)) && Number(v) > 0;
const OBJETIVOS = ['Emagrecimento', 'Ganho de Massa', 'Condicionamento'];
const NIVEIS    = ['Iniciante', 'Intermediário', 'Avançado'];
const buildHistorico = (peso) => [{ id:'1', data:'Hoje', peso:parseFloat(peso) }];
const getSaudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const getDataFormatada = () => new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'short' });
const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

const calcStreak = (log) => {
  if (!log?.length) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const dates = [...new Set(log.map(d => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt.getTime(); }))].sort((a,b) => b-a);
  let streak = 0, check = today.getTime();
  for (const d of dates) {
    if (d === check) { streak++; check -= 86400000; } else if (d < check) break;
  }
  return streak;
};

const calcMetaAgua = (user) => {
  const peso = parseFloat(user.peso) || 70;
  const fator = user.objetivo === 'Ganho de Massa' ? 50 : user.objetivo === 'Condicionamento' ? 45 : 37;
  return Math.round(peso * fator / 50) * 50; // ml, arredondado p/ 50ml
};
const fmtLitros = (ml) => (ml / 1000).toFixed(1).replace('.', ',') + 'L';

const calcMaxStreak = (log) => {
  if (!log?.length) return 0;
  const dates = [...new Set(log.map(d => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt.getTime(); }))].sort((a,b) => a-b);
  if (!dates.length) return 0;
  let max = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] - dates[i-1] === 86400000) { cur++; if (cur > max) max = cur; } else cur = 1;
  }
  return max;
};

// ─── NOTIFICATION HELPERS ────────────────────────────────────────────────────
async function configurarCanalAndroid() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('nutreino-lembrete', {
      name: 'Lembrete de Treino',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00E5A0',
      sound: 'default',
    });
  } catch (_) {}
}

async function agendarLembrete(hora) {
  try {
    await configurarCanalAndroid();
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'Ative as notificações nas configurações do dispositivo.');
      return false;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    const [h, m] = hora.split(':').map(Number);
    if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return false;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hora do treino! 💪',
        body: 'Não perca seu treino de hoje. Vamos lá!',
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'nutreino-lembrete' } : {}),
      },
      trigger: { type: 'daily', hour: h, minute: m },
    });
    return true;
  } catch (e) {
    Alert.alert('Erro', 'Não foi possível agendar o lembrete. Verifique as permissões do app.');
    return false;
  }
}
async function cancelarLembretes() { try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (_) {} }

const AGUA_NOTIF_HOURS = [8,10,12,14,16,18,20];
async function agendarAguaLembretes() {
  try {
    await configurarCanalAndroid();
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    for (const h of AGUA_NOTIF_HOURS) {
      await Notifications.scheduleNotificationAsync({
        identifier: `agua-${h}`,
        content: { title:'💧 Hora de beber água!', body:'Mantenha-se hidratado para o melhor desempenho.', sound:'default' },
        trigger: { type:'daily', hour:h, minute:0, repeats:true },
      });
    }
  } catch (_) {}
}
async function cancelarAguaLembretes() {
  for (const h of AGUA_NOTIF_HOURS) {
    try { await Notifications.cancelScheduledNotificationAsync(`agua-${h}`); } catch (_) {}
  }
}

async function agendarRefeicaoLembrete(id, nome, hora) {
  try {
    await configurarCanalAndroid();
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
    const [h, m] = hora.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return false;
    await Notifications.scheduleNotificationAsync({
      identifier: `refeicao-${id}`,
      content: { title:`🍽️ ${nome}`, body:'Hora de fazer sua refeição!', sound:'default' },
      trigger: { type:'daily', hour:h, minute:m, repeats:true },
    });
    return true;
  } catch { return false; }
}
async function cancelarRefeicaoLembrete(id) {
  try { await Notifications.cancelScheduledNotificationAsync(`refeicao-${id}`); } catch (_) {}
}

// Jejum helpers
const JEJUM_JANELAS = [
  { h:16, label:'16:8', desc:'16h em jejum / 8h alimentação' },
  { h:18, label:'18:6', desc:'18h em jejum / 6h alimentação' },
  { h:20, label:'20:4', desc:'20h em jejum / 4h alimentação' },
];
const formatJejumTime = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

// DOMS muscles
const DOMS_MUSCLES = ['Peito','Costas','Ombros','Bíceps','Tríceps','Abdômen','Quadríceps','Posterior de Coxa','Glúteos','Panturrilha'];
const DOMS_EMOJI = {1:'😊',2:'😐',3:'😬',4:'😣',5:'😱'};

// Workout generator
const GEN_EQUIPAMENTOS = ['Sem equipamento','Halteres','Barra + anilhas','Máquinas','Elástico'];
const GEN_GRUPOS = ['Peito','Costas','Ombros','Bíceps','Tríceps','Pernas','Glúteos','Core','Full-body'];
const GEN_TEMPO = ['20 min','30 min','45 min','60 min'];

const INJURY_MUSCLES = ['Ombro Esquerdo','Ombro Direito','Cotovelo Esquerdo','Cotovelo Direito',
  'Punho Esquerdo','Punho Direito','Joelho Esquerdo','Joelho Direito','Tornozelo','Lombar','Cervical','Quadril'];

// ─── MAKE STYLES ─────────────────────────────────────────────────────────────
const makeStyles = (C) => StyleSheet.create({
  root:               {flex:1, backgroundColor:C.bg},
  screen:             {flex:1, backgroundColor:C.bg, paddingHorizontal:16, paddingTop:14},
  header:             {flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:16, backgroundColor:C.card, elevation:8, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.18, shadowRadius:12, borderBottomWidth:1, borderBottomColor:C.border},
  headerTitle:        {color:C.text, fontSize:22, fontWeight:'900', letterSpacing:-0.3},
  headerSub:          {color:C.accent, fontSize:11, marginTop:2, fontWeight:'700'},
  headerBadge:        {backgroundColor:C.accent, borderRadius:22, paddingHorizontal:13, paddingVertical:6},
  headerBadgeText:    {color:C.bg, fontSize:11, fontWeight:'900', letterSpacing:0.5},
  tabBar:             {flexDirection:'row', backgroundColor:C.card, borderRadius:32, paddingVertical:10, paddingHorizontal:6, marginHorizontal:14, elevation:20, shadowColor:C.accent, shadowOffset:{width:0,height:8}, shadowOpacity:0.18, shadowRadius:20, borderWidth:1, borderColor:C.border},
  tabItem:            {flex:1, alignItems:'center', gap:3},
  tabIconWrap:        {width:44, height:36, borderRadius:18, alignItems:'center', justifyContent:'center'},
  tabIconWrapActive:  {backgroundColor:C.accent, elevation:4, shadowColor:C.accent, shadowOffset:{width:0,height:3}, shadowOpacity:0.45, shadowRadius:8},
  tabLabel:           {color:C.muted, fontSize:10, fontWeight:'600'},
  tabLabelActive:     {color:C.accent, fontWeight:'900', fontSize:10},
  setupBg:            {flex:1, backgroundColor:C.bg},
  setupProgress:      {flexDirection:'row', justifyContent:'center', gap:8, paddingTop:16, paddingBottom:4},
  setupDot:           {width:8, height:8, borderRadius:4, backgroundColor:C.border},
  setupDotActive:     {backgroundColor:C.accent, width:24},
  setupContent:       {padding:24, paddingTop:12, flexGrow:1, justifyContent:'center'},
  setupTitle:         {color:C.text, fontSize:30, fontWeight:'800', lineHeight:38, marginBottom:6},
  setupSub:           {color:C.muted, fontSize:14, lineHeight:20, marginBottom:24},
  setupInputGroup:    {gap:4},
  setupLabel:         {color:C.muted, fontSize:13, marginBottom:6},
  setupFooter:        {padding:20, paddingTop:10, flexDirection:'row', gap:10},
  input:              {backgroundColor:C.card2, borderRadius:18, borderWidth:1.5, borderColor:C.border, color:C.text, padding:14, fontSize:15},
  optionBtn:          {borderRadius:12, borderWidth:1.5, borderColor:C.border, padding:16, marginBottom:10, alignItems:'center'},
  optionBtnActive:    {borderColor:C.accent, backgroundColor:C.accent+'18'},
  optionBtnText:      {color:C.muted, fontSize:15, fontWeight:'600'},
  optionBtnTextActive:{color:C.accent},
  nextBtn:            {flex:1, backgroundColor:C.accent, borderRadius:12, padding:16, alignItems:'center'},
  nextBtnText:        {color:C.bg, fontSize:16, fontWeight:'700'},
  backBtn:            {backgroundColor:C.card2, borderRadius:12, padding:16, paddingHorizontal:20, alignItems:'center'},
  backBtnText:        {color:C.muted, fontSize:15, fontWeight:'600'},
  bigBtn:             {backgroundColor:C.accent, borderRadius:22, padding:18, alignItems:'center', justifyContent:'center', marginTop:10, elevation:8, shadowColor:C.accent, shadowOffset:{width:0,height:6}, shadowOpacity:0.45, shadowRadius:14},
  bigBtnText:         {color:C.bg, fontSize:16, fontWeight:'900', letterSpacing:0.3},
  outlineBtn:         {borderRadius:22, borderWidth:1.5, borderColor:C.accent+'50', padding:16, alignItems:'center', justifyContent:'center', marginTop:10},
  outlineBtnText:     {color:C.accent, fontSize:15, fontWeight:'700'},
  card:               {backgroundColor:C.card, borderRadius:24, padding:18, marginBottom:14, borderWidth:1, borderColor:C.border, elevation:6, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.14, shadowRadius:12},
  row:                {flexDirection:'row', alignItems:'center'},
  dashHeader:         {flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16},
  dashSaudacao:       {color:C.accent, fontSize:13, fontWeight:'800', letterSpacing:0.5},
  dashGreet:          {color:C.text, fontSize:30, fontWeight:'900', marginTop:2, letterSpacing:-0.5},
  objetivoBadge:      {borderRadius:20, borderWidth:1.5, paddingHorizontal:10, paddingVertical:4, alignSelf:'flex-start'},
  objetivoText:       {fontSize:12, fontWeight:'600'},
  streakIcon:         {width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center'},
  summaryCard:        {backgroundColor:C.card, borderRadius:22, padding:16, borderWidth:1, borderColor:C.border, elevation:5, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.12, shadowRadius:10},
  summaryVal:         {color:C.text, fontSize:22, fontWeight:'900'},
  summaryLabel:       {color:C.muted, fontSize:11, marginBottom:8, marginTop:2},
  miniBar:            {height:6, backgroundColor:C.border, borderRadius:3, overflow:'hidden'},
  miniBarFill:        {height:6, borderRadius:3},
  statusPill:         {borderRadius:8, paddingHorizontal:7, paddingVertical:3, marginTop:6, alignSelf:'flex-start'},
  statusPillText:     {fontSize:10, fontWeight:'700'},
  actionBtn:          {borderRadius:12, borderWidth:1.5, padding:12, alignItems:'center', justifyContent:'center', marginTop:8, flexDirection:'row'},
  actionBtnText:      {fontSize:13, fontWeight:'700'},
  sectionTitle:       {color:C.text, fontSize:17, fontWeight:'900', marginTop:14, marginBottom:12, borderLeftWidth:3, borderLeftColor:C.accent, paddingLeft:10},
  sectionTitle2:      {color:C.text, fontSize:14, fontWeight:'800'},
  weekDot:            {width:30, height:30, borderRadius:15, backgroundColor:C.card2, marginBottom:6, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border},
  weekDay:            {color:C.muted, fontSize:11, fontWeight:'600'},
  progressBar:        {height:10, backgroundColor:C.card2, borderRadius:5, overflow:'hidden'},
  progressFill:       {height:10, borderRadius:5},
  macroLabel:         {color:C.text, fontSize:13},
  macroVal:           {fontSize:12, fontWeight:'700'},
  dicaTitle:          {color:C.text, fontSize:13, fontWeight:'700', marginBottom:6},
  dicaText:           {color:C.muted, fontSize:13, lineHeight:20},
  timerCard:          {backgroundColor:C.card2, borderRadius:14, padding:14, marginBottom:12, borderWidth:1, borderColor:C.border, flexDirection:'row', alignItems:'center', justifyContent:'space-between'},
  timerDisplay:       {color:C.accent, fontSize:32, fontWeight:'900'},
  timerLabel:         {color:C.muted, fontSize:11, marginTop:2},
  timerBtn:           {backgroundColor:C.accent+'22', borderRadius:10, paddingVertical:8, paddingHorizontal:16, borderWidth:1, borderColor:C.accent+'80'},
  timerBtnText:       {color:C.accent, fontWeight:'700', fontSize:13},
  workoutTitle:       {fontSize:18, fontWeight:'800', color:C.text, marginBottom:4},
  circularProgress:   {width:52, height:52, borderRadius:26, borderWidth:3, borderColor:C.accent, alignItems:'center', justifyContent:'center'},
  circularText:       {color:C.accent, fontWeight:'700', fontSize:14},
  exCard:             {backgroundColor:C.card, borderRadius:20, padding:16, marginBottom:10, borderWidth:1, borderColor:C.border, flexDirection:'row', alignItems:'center', elevation:4, shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.10, shadowRadius:8},
  exCardDone:         {opacity:0.5, borderColor:C.accent+'30', backgroundColor:C.card2},
  exCheck:            {width:28, height:28, borderRadius:14, borderWidth:2, borderColor:C.muted, alignItems:'center', justifyContent:'center'},
  exCheckDone:        {backgroundColor:C.accent, borderColor:C.accent},
  exName:             {color:C.text, fontSize:15, fontWeight:'700'},
  exSeries:           {color:C.muted, fontSize:12, marginTop:3},
  exBadge:            {width:28, height:28, borderRadius:8, backgroundColor:C.card2, alignItems:'center', justifyContent:'center'},
  exBadgeText:        {color:C.muted, fontSize:12, fontWeight:'700'},
  addSetBtn:          {backgroundColor:C.accent+'22', borderRadius:8, width:32, height:32, alignItems:'center', justifyContent:'center', marginLeft:6, borderWidth:1, borderColor:C.accent+'50'},
  setChip:            {backgroundColor:C.card2, borderRadius:6, paddingHorizontal:7, paddingVertical:2, marginRight:5, marginTop:4, borderWidth:1, borderColor:C.border},
  setChipText:        {color:C.muted, fontSize:10, fontWeight:'600'},
  kcalVal:            {fontSize:15, fontWeight:'800'},
  mealCard:           {backgroundColor:C.card, borderRadius:20, padding:16, marginBottom:10, borderWidth:1, borderColor:C.border, flexDirection:'row', alignItems:'center', elevation:4, shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.10, shadowRadius:8},
  mealCardDone:       {borderColor:C.accent+'60', backgroundColor:C.accent+'10'},
  mealName:           {color:C.text, fontSize:15, fontWeight:'800'},
  mealItems:          {color:C.muted, fontSize:12, marginTop:4, lineHeight:17},
  mealKcal:           {fontSize:15, fontWeight:'900'},
  statCard:           {backgroundColor:C.card, borderRadius:18, padding:14, alignItems:'center', borderWidth:1, borderColor:C.border, elevation:4, shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.10, shadowRadius:8},
  statVal:            {fontSize:20, fontWeight:'900'},
  statLabel:          {color:C.muted, fontSize:10, marginTop:4, textAlign:'center', fontWeight:'600'},
  gridLine:           {position:'absolute', left:0, right:0, height:1, backgroundColor:C.border+'60'},
  chartDot:           {position:'absolute', width:10, height:10, borderRadius:5},
  yAxisLabel:         {position:'absolute', left:0, color:C.muted, fontSize:9},
  histRow:            {backgroundColor:C.card, borderRadius:12, padding:14, marginBottom:6, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:C.border},
  histData:           {color:C.muted, fontSize:13, flex:1},
  histPeso:           {color:C.text, fontSize:15, fontWeight:'700', flex:1, textAlign:'center'},
  histDiff:           {fontSize:13, fontWeight:'700'},
  subTabRow:          {flexDirection:'row', backgroundColor:C.card2, borderRadius:16, padding:4, marginBottom:16},
  subTab:             {flex:1, paddingVertical:10, alignItems:'center', borderRadius:12},
  subTabActive:       {backgroundColor:C.accent, elevation:4, shadowColor:C.accent, shadowOffset:{width:0,height:3}, shadowOpacity:0.35, shadowRadius:6},
  subTabText:         {color:C.muted, fontSize:11, fontWeight:'700'},
  subTabTextActive:   {color:C.bg, fontWeight:'900'},
  medidaCard:         {backgroundColor:C.card, borderRadius:14, padding:14, marginBottom:8, borderWidth:1, borderColor:C.border, elevation:2},
  medidaRow:          {flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:6, borderBottomWidth:1, borderBottomColor:C.border},
  medidaLabel:        {color:C.muted, fontSize:13},
  medidaVal:          {color:C.text, fontSize:14, fontWeight:'700'},
  calcCard:           {backgroundColor:C.card, borderRadius:16, padding:18, marginBottom:12, borderWidth:1, borderColor:C.border, elevation:2},
  calcTitle:          {color:C.text, fontSize:15, fontWeight:'700', marginBottom:10},
  calcResult:         {fontSize:40, fontWeight:'900', marginBottom:2},
  calcSub:            {color:C.muted, fontSize:13, marginBottom:10},
  generoRow:          {flexDirection:'row', gap:8, marginBottom:12},
  generoBtn:          {flex:1, padding:10, borderRadius:10, borderWidth:1.5, borderColor:C.border, alignItems:'center'},
  generoBtnActive:    {borderColor:C.accent, backgroundColor:C.accent+'18'},
  generoBtnText:      {color:C.muted, fontWeight:'600', fontSize:13},
  generoBtnTextActive:{color:C.accent},
  statsRow:           {flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:11, borderBottomWidth:1, borderBottomColor:C.border},
  statsLabel:         {color:C.muted, fontSize:14},
  statsVal:           {color:C.text, fontSize:15, fontWeight:'700'},
  profileHeader:      {alignItems:'center', paddingVertical:36},
  avatarWrapper:      {position:'relative', marginBottom:12},
  photoEditBadge:     {position:'absolute', bottom:0, right:0, width:26, height:26, borderRadius:13, backgroundColor:C.accent, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:C.bg},
  profileName:        {color:C.text, fontSize:22, fontWeight:'800', marginBottom:6},
  profileRow:         {backgroundColor:C.card, borderRadius:12, padding:14, marginBottom:6, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:C.border},
  profileRowLabel:    {color:C.muted, fontSize:13, flex:1},
  profileRowVal:      {color:C.text, fontSize:14, fontWeight:'600'},
  settingRow:         {flexDirection:'row', alignItems:'center', paddingVertical:13},
  settingLabel:       {color:C.text, fontSize:14, flex:1},
  modalOverlay:       {flex:1, backgroundColor:'#000000AA', alignItems:'center', justifyContent:'center', padding:20},
  modalBox:           {backgroundColor:C.card, borderRadius:32, padding:26, width:'100%', borderWidth:1, borderColor:C.border, alignItems:'center', shadowColor:C.accent, shadowOffset:{width:0,height:16}, shadowOpacity:0.15, shadowRadius:28},
  modalTitle:         {color:C.text, fontSize:22, fontWeight:'900', marginTop:10, letterSpacing:-0.3},
  modalSub:           {color:C.muted, fontSize:14, marginTop:8, marginBottom:18, textAlign:'center', lineHeight:20},
  muted:              {color:C.muted, fontSize:13},
  // Hidratação
  waterGlass:         {width:30, height:30, borderRadius:6, alignItems:'center', justifyContent:'center', borderWidth:1.5},
  waterBtn:           {width:34, height:34, borderRadius:10, alignItems:'center', justifyContent:'center', borderWidth:1.5},
  // Peso meta
  metaCard:           {backgroundColor:C.card, borderRadius:16, padding:14, marginBottom:12, borderWidth:1.5, borderColor:C.purple, elevation:2},
  metaLabel:          {color:C.muted, fontSize:12},
  metaVal:            {color:C.text, fontSize:14, fontWeight:'700'},
  // Nota
  notaInput:          {backgroundColor:C.card2, borderRadius:10, borderWidth:1, borderColor:C.border, color:C.text, padding:12, fontSize:14, marginTop:10, width:'100%', minHeight:70, textAlignVertical:'top'},
  notaChip:           {backgroundColor:C.card2, borderRadius:10, padding:12, marginBottom:8, borderWidth:1, borderColor:C.border},
  notaData:           {color:C.muted, fontSize:11, marginBottom:4},
  notaText:           {color:C.text, fontSize:13, lineHeight:18},
  // Skeleton
  skelBox:            {backgroundColor:C.card2, borderRadius:10},
  // Lock Screen
  lockRoot:           {flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center', padding:32},
  lockBtn:            {backgroundColor:C.accent, borderRadius:16, padding:18, paddingHorizontal:40, flexDirection:'row', alignItems:'center', marginTop:32},
  // Calendário
  calHeader:          {flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14},
  calMesTitle:        {color:C.text, fontSize:16, fontWeight:'700'},
  calNavBtn:          {width:32, height:32, borderRadius:16, backgroundColor:C.card2, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border},
  calWeekRow:         {flexDirection:'row', marginBottom:6},
  calWeekLabel:       {flex:1, textAlign:'center', color:C.muted, fontSize:11, fontWeight:'600'},
  calGrid:            {flexDirection:'row', flexWrap:'wrap'},
  calDay:             {width:`${100/7}%`, aspectRatio:1, alignItems:'center', justifyContent:'center', marginBottom:4},
  calDayNum:          {fontSize:13, fontWeight:'600', color:C.text},
  calDayHoje:         {backgroundColor:C.accent+'22', borderRadius:20, width:32, height:32, alignItems:'center', justifyContent:'center'},
  calDayHojeNum:      {color:C.accent, fontWeight:'800'},
  calDots:            {flexDirection:'row', gap:3, marginTop:2},
  calDot:             {width:5, height:5, borderRadius:3},
  calLegend:          {flexDirection:'row', gap:16, marginTop:12, justifyContent:'center'},
  calLegendItem:      {flexDirection:'row', alignItems:'center', gap:5},
  calLegendDot:       {width:8, height:8, borderRadius:4},
  calLegendText:      {color:C.muted, fontSize:11},
  // Custom Workouts
  customCard:         {backgroundColor:C.card, borderRadius:14, padding:14, marginBottom:8, borderWidth:1, borderColor:C.border, flexDirection:'row', alignItems:'center'},
  customCardName:     {color:C.text, fontSize:14, fontWeight:'700', flex:1},
  customCardSub:      {color:C.muted, fontSize:12, marginTop:2},
  customIconBtn:      {width:34, height:34, borderRadius:10, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border, marginLeft:6},
  customExRow:        {flexDirection:'row', alignItems:'center', gap:8, marginBottom:8},
  addExBtn:           {borderRadius:10, borderWidth:1.5, borderColor:C.accent+'60', paddingVertical:10, alignItems:'center', marginTop:4},
  workoutSelector:    {flexDirection:'row', backgroundColor:C.card2, borderRadius:12, padding:3, marginBottom:12},
  workoutSelectorTab: {flex:1, paddingVertical:8, alignItems:'center', borderRadius:9},
  workoutSelectorActive:{backgroundColor:C.card, elevation:2},
  // Weekly macros chart
  barChart:           {flexDirection:'row', alignItems:'flex-end', height:90, gap:4, paddingTop:8},
  barWrap:            {flex:1, alignItems:'center'},
  bar:                {width:'80%', borderRadius:4, borderTopLeftRadius:4, borderTopRightRadius:4},
  barLabel:           {color:C.muted, fontSize:9, marginTop:3},
  barValue:           {color:C.muted, fontSize:8, marginBottom:2},
  // Onboarding
  onboardBg:          {flex:1, backgroundColor:C.bg, justifyContent:'space-between'},
  onboardDot:         {height:4, borderRadius:2, flex:1},
  // Swap modal
  swapBtn:            {width:32, height:32, borderRadius:9, alignItems:'center', justifyContent:'center', borderWidth:1, marginLeft:4},
  swapAltCard:        {backgroundColor:C.card2, borderRadius:12, padding:12, marginBottom:8, borderWidth:1, borderColor:C.border},
  swapAltName:        {color:C.text, fontSize:14, fontWeight:'700'},
  swapAltSeries:      {color:C.muted, fontSize:12, marginTop:2},
  // Weekly report
  reportCard:         {backgroundColor:C.card, borderRadius:16, padding:14, marginBottom:10, borderWidth:1.5, borderColor:C.purple, elevation:2},
  reportTitle:        {color:C.purple, fontWeight:'800', fontSize:14},
  reportSub:          {color:C.muted, fontSize:11, marginBottom:8},
  reportStat:         {flex:1, alignItems:'center', paddingVertical:8, borderRadius:10},
  reportStatVal:      {fontSize:20, fontWeight:'900'},
  reportStatLabel:    {color:C.muted, fontSize:11, marginTop:2},
  // Training freq chart
  freqCard:           {backgroundColor:C.card, borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:C.border, elevation:2},
  // Achievements
  achGrid:            {flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:4},
  achItem:            {width:(width-80)/3, alignItems:'center', backgroundColor:C.card2, borderRadius:14, padding:10, borderWidth:1, borderColor:C.border},
  achItemUnlocked:    {borderColor:C.accent, backgroundColor:C.accent+'12'},
  achEmoji:           {fontSize:28, marginBottom:4},
  achTitle:           {color:C.text, fontSize:10, fontWeight:'700', textAlign:'center'},
  achDesc:            {color:C.muted, fontSize:9, textAlign:'center', marginTop:2, lineHeight:12},
  achLocked:          {opacity:0.35},
  // Analysis card
  analysisCard:       {backgroundColor:C.card, borderRadius:16, padding:16, marginBottom:12, borderWidth:1, borderColor:C.border, elevation:2},
  analysisText:       {color:C.text, fontSize:14, lineHeight:22},
  // Color picker
  colorDot:           {width:36, height:36, borderRadius:18, margin:5, borderWidth:3},
  // Exercise timer
  exTimerChip:        {flexDirection:'row', alignItems:'center', backgroundColor:C.orange+'22', borderRadius:8, paddingHorizontal:8, paddingVertical:3, marginTop:4, borderWidth:1, borderColor:C.orange+'60'},
  exTimerText:        {color:C.orange, fontSize:11, fontWeight:'700', marginLeft:4},
  // Macros
  macroRow:           {flexDirection:'row', alignItems:'center', marginBottom:10},
  macroBarLabel:      {width:76, color:C.muted, fontSize:12, fontWeight:'700'},
  macroBarBg:         {flex:1, height:9, backgroundColor:C.border, borderRadius:5, overflow:'hidden'},
  macroBarFill:       {height:'100%', borderRadius:5},
  macroValText:       {width:72, textAlign:'right', color:C.text, fontSize:11, fontWeight:'700'},
  // Food log
  foodLogCard:        {flexDirection:'row', alignItems:'center', backgroundColor:C.card2, borderRadius:12, padding:10, marginBottom:6, borderWidth:1, borderColor:C.border},
  foodLogName:        {color:C.text, fontSize:13, fontWeight:'700', flex:1},
  foodLogMacros:      {color:C.muted, fontSize:10, marginTop:2},
  foodLibCard:        {flexDirection:'row', alignItems:'center', padding:12, borderBottomWidth:1, borderBottomColor:C.border},
  foodLibName:        {flex:1, color:C.text, fontSize:13, fontWeight:'700'},
  foodLibSub:         {color:C.muted, fontSize:10, marginTop:2},
  foodCatRow:         {flexGrow:0, marginBottom:14},
  foodCatChip:        {paddingVertical:10, paddingHorizontal:18, borderRadius:22, borderWidth:2, borderColor:C.muted, backgroundColor:'transparent', marginRight:8, justifyContent:'center'},
  foodCatChipOn:      {borderColor:C.accent, backgroundColor:C.accent},
  foodCatChipText:    {color:C.muted, fontSize:13, fontWeight:'700'},
  foodCatChipTextOn:  {color:C.bg, fontWeight:'900'},
  // Guided workout
  guidedOverlay:      {flex:1, backgroundColor:'#00000090', justifyContent:'flex-end'},
  guidedCard:         {backgroundColor:C.card, borderTopLeftRadius:28, borderTopRightRadius:28, padding:24, paddingBottom:36},
  guidedProgDot:      {height:5, flex:1, borderRadius:3, backgroundColor:C.border},
  guidedProgDotOn:    {backgroundColor:C.accent},
  // Cardio stats tab
  cardioSumCard:      {flex:1, backgroundColor:C.card2, borderRadius:14, padding:14, alignItems:'center', borderWidth:1, borderColor:C.border, margin:3},
  cardioSumVal:       {fontSize:20, fontWeight:'900', color:C.accent},
  cardioSumLabel:     {color:C.muted, fontSize:10, marginTop:3},
  // Cardio
  cardioActRow:       {flexDirection:'row', gap:8, marginBottom:16, flexWrap:'wrap'},
  cardioActChip:      {flexDirection:'row', alignItems:'center', gap:6, paddingVertical:10, paddingHorizontal:14, borderRadius:14, borderWidth:1.5, borderColor:C.border, backgroundColor:C.card2},
  cardioActChipOn:    {borderColor:C.accent, backgroundColor:C.accent+'20'},
  cardioActLabel:     {color:C.muted, fontSize:13, fontWeight:'700'},
  cardioActLabelOn:   {color:C.accent},
  cardioTimerBig:     {fontSize:64, fontWeight:'900', color:C.text, textAlign:'center', letterSpacing:2, marginVertical:8},
  cardioStatRow:      {flexDirection:'row', gap:10, marginBottom:10},
  cardioStatCard:     {flex:1, backgroundColor:C.card2, borderRadius:14, padding:14, alignItems:'center', borderWidth:1, borderColor:C.border},
  cardioStatVal:      {fontSize:22, fontWeight:'900', color:C.accent, marginBottom:2},
  cardioStatLabel:    {fontSize:11, color:C.muted, textAlign:'center'},
  cardioHistCard:     {flexDirection:'row', alignItems:'center', backgroundColor:C.card2, borderRadius:12, padding:12, marginBottom:8, borderWidth:1, borderColor:C.border},
  cardioHistEmoji:    {fontSize:22, marginRight:10},
  cardioHistInfo:     {flex:1},
  cardioHistTitle:    {color:C.text, fontSize:13, fontWeight:'800'},
  cardioHistSub:      {color:C.muted, fontSize:11, marginTop:2},
  cardioHistKcal:     {color:C.accent, fontSize:14, fontWeight:'900'},
});

// ─── SCREEN ANIMATION HOOK ───────────────────────────────────────────────────
function useScreenAnimation() {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue:1, duration:280, useNativeDriver:true }),
      Animated.timing(translateY, { toValue:0, duration:280, useNativeDriver:true }),
    ]).start();
  }, []);
  return { opacity, transform:[{ translateY }] };
}

// ─── ACHIEVEMENT UNLOCK MODAL ─────────────────────────────────────────────────
function AchievementUnlockModal({ achievement, onClose }) {
  const { C } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!achievement) return;
    scale.setValue(0); glow.setValue(0);
    Animated.sequence([
      Animated.spring(scale, { toValue:1, tension:110, friction:6, useNativeDriver:true }),
      Animated.timing(glow, { toValue:1, duration:400, useNativeDriver:false }),
    ]).start();
    try { Vibration.vibrate([0,80,60,120,60,200]); } catch(_) {}
  }, [achievement]);

  if (!achievement) return null;
  const borderColor = glow.interpolate({ inputRange:[0,1], outputRange:[C.border, C.accent] });

  return (
    <Modal visible={!!achievement} transparent animationType="fade">
      <View style={{ flex:1, backgroundColor:'#00000099', alignItems:'center', justifyContent:'center', padding:32 }}>
        <Animated.View style={{ backgroundColor:C.card, borderRadius:24, padding:28, alignItems:'center', width:'100%', borderWidth:2, borderColor, elevation:12 }}>
          <Animated.Text style={{ fontSize:60, transform:[{scale}] }}>{achievement.emoji}</Animated.Text>
          <Text style={{ color:C.accent, fontSize:13, fontWeight:'700', marginTop:12, letterSpacing:1.5 }}>CONQUISTA DESBLOQUEADA!</Text>
          <Text style={{ color:C.text, fontSize:22, fontWeight:'900', marginTop:8, textAlign:'center' }}>{achievement.title}</Text>
          <Text style={{ color:C.muted, fontSize:14, marginTop:6, textAlign:'center' }}>{achievement.desc}</Text>
          <TouchableOpacity style={{ backgroundColor:C.accent, borderRadius:14, padding:14, paddingHorizontal:36, marginTop:20 }} onPress={onClose}>
            <Text style={{ color:C.bg, fontWeight:'800', fontSize:15 }}>Incrível! 🎉</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function SkeletonCard({ height = 80, style }) {
  const { C } = useTheme();
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue:1, duration:700, useNativeDriver:true }),
      Animated.timing(anim, { toValue:0.4, duration:700, useNativeDriver:true }),
    ])).start();
  }, []);
  return <Animated.View style={[{ height, borderRadius:14, backgroundColor:C.card2, marginBottom:10 }, style, { opacity:anim }]} />;
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function OnboardingScreen({ onComplete }) {
  const { C } = useTheme();
  const [slide, setSlide] = useState(0);
  const slideAnim = useRef(new Animated.Value(1)).current;

  const slides = [
    { emoji:'💪', title:'Treinos\nPersonalizados', sub:'9 combinações de treino adaptadas ao seu objetivo e nível de experiência.', color:C.accent },
    { emoji:'🥗', title:'Dieta\nCompleta', sub:'Plano alimentar com calorias, macros e refeições detalhadas para cada objetivo.', color:C.orange },
    { emoji:'📊', title:'Acompanhe sua\nEvolução', sub:'Gráficos de peso, medidas corporais, calculadoras e estatísticas detalhadas.', color:C.blue },
    { emoji:'🔥', title:'Mantenha a\nConsistência', sub:'Streak de dias treinando, relatório semanal automático e lembretes diários.', color:C.purple },
  ];

  const goNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue:0, duration:100, useNativeDriver:true }),
      Animated.timing(slideAnim, { toValue:1, duration:220, useNativeDriver:true }),
    ]).start();
    if (slide < slides.length - 1) setSlide(s => s + 1);
    else onComplete();
  };

  const s = slides[slide];
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg, justifyContent:'space-between' }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={{ flexDirection:'row', paddingHorizontal:32, paddingTop:28, gap:6 }}>
        {slides.map((_,i) => (
          <View key={i} style={{ height:4, borderRadius:2, flex:1, backgroundColor:i <= slide ? s.color : C.border }} />
        ))}
      </View>
      <Animated.View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:32, opacity:slideAnim }}>
        <View style={{ width:130, height:130, borderRadius:65, backgroundColor:s.color+'1A', alignItems:'center', justifyContent:'center', marginBottom:36, borderWidth:2, borderColor:s.color+'40' }}>
          <Text style={{ fontSize:60 }}>{s.emoji}</Text>
        </View>
        <Text style={{ color:C.text, fontSize:30, fontWeight:'900', textAlign:'center', marginBottom:16, lineHeight:38 }}>{s.title}</Text>
        <Text style={{ color:C.muted, fontSize:16, textAlign:'center', lineHeight:26 }}>{s.sub}</Text>
      </Animated.View>
      <View style={{ padding:24, paddingTop:12, gap:10 }}>
        <TouchableOpacity style={{ backgroundColor:s.color, borderRadius:14, padding:17, alignItems:'center' }} onPress={goNext}>
          <Text style={{ color:C.bg, fontSize:16, fontWeight:'800' }}>{slide < slides.length - 1 ? 'Próximo →' : 'Começar 🚀'}</Text>
        </TouchableOpacity>
        {slide < slides.length - 1 && (
          <TouchableOpacity style={{ alignItems:'center', padding:10 }} onPress={onComplete}>
            <Text style={{ color:C.muted, fontSize:14 }}>Pular introdução</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── COMPLETION MODAL ─────────────────────────────────────────────────────────
function CompletionModal({ visible, onClose, userName, timerSec, feitos, total, onSaveNota }) {
  const { C } = useTheme();
  const [notaInput, setNotaInput] = useState('');
  const emojiScale  = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const burstAnim   = useRef(new Animated.Value(0)).current;
  const burstOpacity= useRef(new Animated.Value(1)).current;

  const COLORS = [C.accent, C.orange, C.blue, C.purple, '#FFD700', '#FF69B4', C.accent, C.orange, C.blue, C.purple, '#FFD700', '#FF69B4'];
  const ANGLES = Array.from({length:12}, (_,i) => (i/12) * Math.PI * 2);

  useEffect(() => {
    if (!visible) return;
    emojiScale.setValue(0); contentFade.setValue(0); burstAnim.setValue(0); burstOpacity.setValue(1);
    setNotaInput('');
    Animated.sequence([
      Animated.spring(emojiScale, { toValue:1, tension:120, friction:6, useNativeDriver:true }),
      Animated.parallel([
        Animated.timing(contentFade, { toValue:1, duration:250, useNativeDriver:true }),
        Animated.sequence([
          Animated.timing(burstAnim, { toValue:1, duration:500, useNativeDriver:true }),
          Animated.timing(burstOpacity, { toValue:0, duration:300, useNativeDriver:true }),
        ]),
      ]),
    ]).start();
  }, [visible]);

  const handleClose = () => { if (notaInput.trim()) onSaveNota(notaInput.trim()); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex:1, backgroundColor:'#000000CC', alignItems:'center', justifyContent:'center' }}>
        {/* Particles */}
        <View style={{ position:'absolute', width:'100%', height:'100%', alignItems:'center', justifyContent:'center' }}>
          {ANGLES.map((angle, i) => {
            const dist = 90 + (i % 3) * 35;
            const tx = burstAnim.interpolate({ inputRange:[0,1], outputRange:[0, Math.cos(angle)*dist] });
            const ty = burstAnim.interpolate({ inputRange:[0,1], outputRange:[0, Math.sin(angle)*dist] });
            const sz = 8 + (i % 3) * 4;
            return (
              <Animated.View key={i} style={{
                position:'absolute', width:sz, height:sz, borderRadius:sz/2,
                backgroundColor:COLORS[i % COLORS.length],
                opacity:burstOpacity,
                transform:[{ translateX:tx },{ translateY:ty }],
              }} />
            );
          })}
        </View>
        {/* Modal box */}
        <View style={{ backgroundColor:C.card, borderRadius:24, padding:24, width:'90%', borderWidth:1, borderColor:C.border, alignItems:'center', elevation:10 }}>
          <Animated.Text style={{ fontSize:64, transform:[{scale:emojiScale}] }}>🏆</Animated.Text>
          <Animated.View style={{ opacity:contentFade, alignItems:'center', width:'100%' }}>
            <Text style={{ color:C.text, fontSize:24, fontWeight:'900', marginTop:12, marginBottom:4 }}>Treino Completo!</Text>
            <Text style={{ color:C.muted, fontSize:14, textAlign:'center', marginBottom:18 }}>Incrível, {userName}! Continue assim! 🔥</Text>
            <View style={{ flexDirection:'row', gap:12, marginBottom:18, width:'100%' }}>
              <View style={{ flex:1, alignItems:'center', backgroundColor:C.accent+'16', borderRadius:12, padding:14, borderWidth:1, borderColor:C.accent+'40' }}>
                <Text style={{ color:C.accent, fontSize:22, fontWeight:'900' }}>{formatTime(timerSec)}</Text>
                <Text style={{ color:C.muted, fontSize:11, marginTop:3 }}>Duração</Text>
              </View>
              <View style={{ flex:1, alignItems:'center', backgroundColor:C.orange+'16', borderRadius:12, padding:14, borderWidth:1, borderColor:C.orange+'40' }}>
                <Text style={{ color:C.orange, fontSize:22, fontWeight:'900' }}>{feitos}/{total}</Text>
                <Text style={{ color:C.muted, fontSize:11, marginTop:3 }}>Exercícios</Text>
              </View>
            </View>
            <Text style={{ color:C.muted, fontSize:13, marginBottom:6, alignSelf:'flex-start' }}>Como foi o treino? (opcional)</Text>
            <TextInput
              style={{ backgroundColor:C.card2, borderRadius:10, borderWidth:1, borderColor:C.border, color:C.text, padding:12, fontSize:14, width:'100%', minHeight:65, textAlignVertical:'top', marginBottom:14 }}
              placeholder="Ex: Senti bem, aumentei a carga no supino..."
              placeholderTextColor={C.muted}
              value={notaInput}
              onChangeText={setNotaInput}
              multiline
              maxLength={200}
            />
            <TouchableOpacity style={{ backgroundColor:C.accent, borderRadius:14, padding:16, width:'100%', alignItems:'center' }} onPress={handleClose}>
              <Text style={{ color:C.bg, fontSize:16, fontWeight:'700' }}>Fechar 💪</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

// ─── LOCK SCREEN ──────────────────────────────────────────────────────────────
function LockScreen({ onAutenticar }) {
  const { C, styles } = useTheme();
  return (
    <View style={styles.lockRoot}>
      <Text style={{ fontSize:72 }}>💪</Text>
      <Text style={{ color:C.text, fontSize:28, fontWeight:'800', marginTop:16 }}>NuTreino</Text>
      <Text style={[styles.muted, { marginTop:8, textAlign:'center' }]}>Autentique-se para continuar</Text>
      <TouchableOpacity style={styles.lockBtn} onPress={onAutenticar}>
        <Ionicons name="finger-print" size={22} color={C.bg} style={{ marginRight:10 }} />
        <Text style={{ color:C.bg, fontWeight:'800', fontSize:16 }}>Desbloquear</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── CALENDÁRIO MODAL ─────────────────────────────────────────────────────────
function CalendarioModal({ visible, onClose, treinosLog, aguaGoalLog }) {
  const { C, styles } = useTheme();
  const hoje = new Date();
  const [calMes, setCalMes] = useState(hoje.getMonth());
  const [calAno, setCalAno] = useState(hoje.getFullYear());

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DIAS_SEMANA = ['D','S','T','Q','Q','S','S'];

  const primeiroDia = new Date(calAno, calMes, 1).getDay();
  const diasNoMes   = new Date(calAno, calMes + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < primeiroDia; i++) cells.push(null);
  for (let i = 1; i <= diasNoMes; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const dateKey = (d) => d ? `${calAno}-${String(calMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '';
  const temTreino  = (d) => d && (treinosLog||[]).includes(dateKey(d));
  const temAgua    = (d) => d && (aguaGoalLog||[]).includes(dateKey(d));
  const isHoje     = (d) => d && calAno===hoje.getFullYear() && calMes===hoje.getMonth() && d===hoje.getDate();
  const isFuturo   = (d) => d && new Date(calAno, calMes, d) > hoje;

  const navMes = (dir) => {
    let m = calMes + dir, a = calAno;
    if (m < 0) { m = 11; a--; }
    if (m > 11) { m = 0; a++; }
    setCalMes(m); setCalAno(a);
  };

  const totalTreinos = cells.filter(d => temTreino(d)).length;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.modalOverlay, { justifyContent:'flex-end', padding:0 }]}>
        <View style={{ backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, maxHeight:'90%' }}>
          <View style={[styles.row, { justifyContent:'space-between', marginBottom:16 }]}>
            <Text style={{ color:C.text, fontSize:18, fontWeight:'800' }}>📅 Calendário</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={C.muted} /></TouchableOpacity>
          </View>

          <View style={styles.calHeader}>
            <TouchableOpacity style={styles.calNavBtn} onPress={() => navMes(-1)}>
              <Ionicons name="chevron-back" size={16} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.calMesTitle}>{MESES[calMes]} {calAno}</Text>
            <TouchableOpacity style={styles.calNavBtn} onPress={() => navMes(1)}>
              <Ionicons name="chevron-forward" size={16} color={C.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.calWeekRow}>
            {DIAS_SEMANA.map((d,i) => <Text key={i} style={styles.calWeekLabel}>{d}</Text>)}
          </View>

          <View style={styles.calGrid}>
            {cells.map((d, i) => (
              <View key={i} style={styles.calDay}>
                {d && (
                  <>
                    <View style={[isHoje(d) && styles.calDayHoje]}>
                      <Text style={[styles.calDayNum, isFuturo(d) && { color:C.border }, isHoje(d) && styles.calDayHojeNum]}>{d}</Text>
                    </View>
                    <View style={styles.calDots}>
                      {temTreino(d) && <View style={[styles.calDot, { backgroundColor:C.accent }]} />}
                      {temAgua(d)   && <View style={[styles.calDot, { backgroundColor:C.blue }]} />}
                    </View>
                  </>
                )}
              </View>
            ))}
          </View>

          <View style={styles.calLegend}>
            <View style={styles.calLegendItem}><View style={[styles.calLegendDot, { backgroundColor:C.accent }]} /><Text style={styles.calLegendText}>Treino</Text></View>
            <View style={styles.calLegendItem}><View style={[styles.calLegendDot, { backgroundColor:C.blue }]} /><Text style={styles.calLegendText}>Hidratação</Text></View>
          </View>

          {totalTreinos > 0 && (
            <View style={[styles.card, { marginTop:12, marginBottom:0, padding:12, backgroundColor:C.accent+'14', borderColor:C.accent }]}>
              <Text style={{ color:C.accent, fontWeight:'700', textAlign:'center' }}>
                {totalTreinos} treino{totalTreinos!==1?'s':''} em {MESES[calMes]}! 🎉
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function AvatarImg({ uri, name, size, fontSize, style }) {
  const { C } = useTheme();
  return (
    <View style={[{ width:size, height:size, borderRadius:size/2, backgroundColor:C.accent+'30', alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:C.accent, overflow:'hidden' }, style]}>
      {uri
        ? <Image source={{ uri }} style={{ width:size, height:size }} />
        : <Text style={{ color:C.accent, fontSize, fontWeight:'800' }}>{name?.[0]?.toUpperCase() || '?'}</Text>
      }
    </View>
  );
}

// ─── SETUP SCREEN ─────────────────────────────────────────────────────────────
function SetupScreen({ onComplete }) {
  const { C, styles } = useTheme();
  const [step, setStep]         = useState(0);
  const [nome, setNome]         = useState('');
  const [idade, setIdade]       = useState('');
  const [altura, setAltura]     = useState('');
  const [peso, setPeso]         = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [nivel, setNivel]       = useState('');

  const steps = [
    { title:'Bem-vindo ao\nNuTreino 💪', sub:'Seu companheiro de treino\ne nutrição personalizado',
      content:(<View style={styles.setupInputGroup}><Text style={styles.setupLabel}>Como podemos te chamar?</Text><TextInput style={styles.input} placeholder="Seu nome" placeholderTextColor={C.muted} value={nome} onChangeText={setNome} /></View>), valid:nome.trim().length > 1 },
    { title:'Seus Dados\nCorporais 📏', sub:'Precisamos para calcular\nsua meta calórica',
      content:(<View style={styles.setupInputGroup}><Text style={styles.setupLabel}>Idade</Text><TextInput style={styles.input} placeholder="Ex: 22" placeholderTextColor={C.muted} value={idade} onChangeText={setIdade} keyboardType="numeric" /><Text style={[styles.setupLabel,{marginTop:14}]}>Altura (cm)</Text><TextInput style={styles.input} placeholder="Ex: 175" placeholderTextColor={C.muted} value={altura} onChangeText={setAltura} keyboardType="numeric" /><Text style={[styles.setupLabel,{marginTop:14}]}>Peso atual (kg)</Text><TextInput style={styles.input} placeholder="Ex: 72" placeholderTextColor={C.muted} value={peso} onChangeText={setPeso} keyboardType="numeric" /></View>), valid:isPositiveNum(idade) && isPositiveNum(altura) && isPositiveNum(peso) },
    { title:'Qual seu\nObjetivo? 🎯', sub:'Vamos personalizar tudo\npara você',
      content:(<View style={styles.setupInputGroup}>{OBJETIVOS.map(o => (<TouchableOpacity key={o} style={[styles.optionBtn, objetivo===o && styles.optionBtnActive]} onPress={() => setObjetivo(o)}><Text style={[styles.optionBtnText, objetivo===o && styles.optionBtnTextActive]}>{o}</Text></TouchableOpacity>))}</View>), valid:!!objetivo },
    { title:'Seu Nível de\nExperiência 🏋️', sub:'Para montar os treinos\ncertos para você',
      content:(<View style={styles.setupInputGroup}>{NIVEIS.map(n => (<TouchableOpacity key={n} style={[styles.optionBtn, nivel===n && styles.optionBtnActive]} onPress={() => setNivel(n)}><Text style={[styles.optionBtnText, nivel===n && styles.optionBtnTextActive]}>{n}</Text></TouchableOpacity>))}</View>), valid:!!nivel },
  ];

  const current = steps[step];
  return (
    <SafeAreaView style={styles.setupBg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.setupProgress}>{steps.map((_,i) => <View key={i} style={[styles.setupDot, i<=step && styles.setupDotActive]} />)}</View>
      <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.setupTitle}>{current.title}</Text>
        <Text style={styles.setupSub}>{current.sub}</Text>
        {current.content}
      </ScrollView>
      <View style={styles.setupFooter}>
        {step > 0 && <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s-1)}><Text style={styles.backBtnText}>← Voltar</Text></TouchableOpacity>}
        <TouchableOpacity style={[styles.nextBtn, !current.valid && {opacity:0.4}]} disabled={!current.valid}
          onPress={() => { if (step < steps.length-1) setStep(s => s+1); else onComplete({ nome, idade, altura, peso, objetivo, nivel, photoUri:null }); }}>
          <Text style={styles.nextBtnText}>{step === steps.length-1 ? 'Começar 🚀' : 'Próximo →'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── TAB BAR ──────────────────────────────────────────────────────────────────
function TabBar({ active, onSelect }) {
  const { C, styles } = useTheme();
  const insets = useSafeAreaInsets();
  const tabs = [
    { id:'dashboard', icon:'home',         iconOut:'home-outline',         label:'Início'    },
    { id:'treino',    icon:'barbell',       iconOut:'barbell-outline',       label:'Treino'    },
    { id:'dieta',     icon:'restaurant',    iconOut:'restaurant-outline',    label:'Dieta'     },
    { id:'progresso', icon:'stats-chart',   iconOut:'stats-chart-outline',   label:'Progresso' },
    { id:'perfil',    icon:'person-circle', iconOut:'person-circle-outline', label:'Perfil'    },
  ];
  return (
    <View style={[styles.tabBar, { marginBottom:(insets.bottom || 0) + 10 }]}>
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <TouchableOpacity key={t.id} style={styles.tabItem} onPress={() => onSelect(t.id)}>
            <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
              <Ionicons name={isActive ? t.icon : t.iconOut} size={22} color={isActive ? C.bg : C.muted} />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── JEJUM CARD ───────────────────────────────────────────────────────────────
function JejumCard({ jejumAtivo, jejumStart, jejumJanela, setJejumAtivo, setJejumStart, setJejumJanela, jejumHistory, setJejumHistory }) {
  const { C, styles } = useTheme();
  const [now, setNow] = useState(Date.now());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!jejumAtivo) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [jejumAtivo]);

  const elapsed = jejumAtivo && jejumStart ? (now - new Date(jejumStart).getTime()) : 0;
  const meta = jejumJanela * 3600 * 1000;
  const pct = Math.min(elapsed / meta, 1);
  const remaining = Math.max(meta - elapsed, 0);
  const fase = pct < 0.25 ? { label:'Digestão', color:C.blue } :
               pct < 0.5  ? { label:'Queima de Glicogênio', color:C.orange } :
               pct < 0.75 ? { label:'Queima de Gordura', color:C.accent } :
                            { label:'Cetose', color:C.purple };

  const iniciar = () => {
    setJejumAtivo(true);
    setJejumStart(new Date().toISOString());
    setShowPicker(false);
  };

  const encerrar = () => {
    const duracaoH = (elapsed / 3600000).toFixed(1);
    const concluido = elapsed >= meta;
    setJejumHistory(prev => [...(prev||[]).slice(-29), {
      date: todayKey(), duracao: duracaoH, janela: jejumJanela, concluido,
    }]);
    setJejumAtivo(false);
    setJejumStart(null);
    if (concluido) Alert.alert('🎉 Jejum Concluído!', `Você completou ${jejumJanela}h de jejum! Excelente disciplina.`);
  };

  const consecutivos = (jejumHistory||[]).filter(j => j.concluido).length;

  return (
    <View style={[styles.card, { marginBottom:10, borderLeftWidth:3, borderLeftColor:C.purple }]}>
      <View style={[styles.row, { marginBottom:8, justifyContent:'space-between' }]}>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={16} color={C.purple} style={{ marginRight:6 }} />
          <Text style={{ color:C.purple, fontWeight:'800', fontSize:12 }}>JEJUM INTERMITENTE</Text>
        </View>
        {consecutivos > 0 && <Text style={{ color:C.muted, fontSize:11 }}>🔥 {consecutivos} concluídos</Text>}
      </View>

      {!jejumAtivo ? (
        showPicker ? (
          <View>
            <Text style={{ color:C.muted, fontSize:12, marginBottom:8 }}>Escolha a janela de jejum:</Text>
            {JEJUM_JANELAS.map(j => (
              <TouchableOpacity key={j.h} onPress={() => { setJejumJanela(j.h); iniciar(); }}
                style={[{ padding:10, borderRadius:8, marginBottom:6, backgroundColor:C.card2, borderWidth:1, borderColor:jejumJanela===j.h?C.purple:C.border }]}>
                <Text style={{ color:C.text, fontWeight:'700' }}>{j.label}</Text>
                <Text style={{ color:C.muted, fontSize:11 }}>{j.desc}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowPicker(false)} style={{ marginTop:4 }}>
              <Text style={{ color:C.muted, textAlign:'center', fontSize:12 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ alignItems:'center' }}>
            <Text style={{ color:C.muted, fontSize:12, marginBottom:10 }}>
              {(jejumHistory||[]).length > 0 ? `Último: ${(jejumHistory||[]).slice(-1)[0]?.duracao}h` : 'Nenhum jejum registrado'}
            </Text>
            <TouchableOpacity style={[styles.bigBtn, { paddingHorizontal:24, paddingVertical:10 }]} onPress={() => setShowPicker(true)}>
              <Text style={styles.bigBtnText}>Iniciar Jejum</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <View>
          <View style={[styles.row, { justifyContent:'space-between', marginBottom:6 }]}>
            <Text style={{ color:fase.color, fontWeight:'700', fontSize:13 }}>{fase.label}</Text>
            <Text style={{ color:C.muted, fontSize:12 }}>{jejumJanela}:8</Text>
          </View>
          <View style={{ height:8, backgroundColor:C.card2, borderRadius:4, marginBottom:8 }}>
            <View style={{ height:8, width:`${pct*100}%`, backgroundColor:fase.color, borderRadius:4 }} />
          </View>
          <View style={[styles.row, { justifyContent:'space-between', marginBottom:10 }]}>
            <View>
              <Text style={{ color:C.muted, fontSize:11 }}>Decorrido</Text>
              <Text style={{ color:C.text, fontWeight:'700', fontSize:16 }}>{formatJejumTime(elapsed)}</Text>
            </View>
            <View style={{ alignItems:'flex-end' }}>
              <Text style={{ color:C.muted, fontSize:11 }}>Restante</Text>
              <Text style={{ color:fase.color, fontWeight:'700', fontSize:16 }}>{formatJejumTime(remaining)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={encerrar} style={[styles.outlineBtn, { borderColor:C.danger }]}>
            <Text style={[styles.outlineBtnText, { color:C.danger }]}>Encerrar Jejum</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function ConfettiView({ visible, onDone }) {
  const particles = useRef(Array.from({ length:30 }, (_, i) => ({
    anim: new Animated.Value(0),
    x: (Math.random() * width),
    color: ['#00E5A0','#FF6B35','#4A9EFF','#A855F7','#FFD700','#FF69B4'][i % 6],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 400,
  }))).current;

  useEffect(() => {
    if (!visible) return;
    const anims = particles.map(p =>
      Animated.timing(p.anim, { toValue:1, duration:1200, delay:p.delay, useNativeDriver:true })
    );
    Animated.parallel(anims).start(() => { setTimeout(onDone, 300); });
    return () => particles.forEach(p => p.anim.setValue(0));
  }, [visible]);

  if (!visible) return null;
  return (
    <View style={{ position:'absolute', top:0, left:0, right:0, height:400, pointerEvents:'none' }}>
      {particles.map((p, i) => (
        <Animated.View key={i} style={{
          position:'absolute', left:p.x, top:0, width:p.size, height:p.size, borderRadius:p.size/2,
          backgroundColor:p.color,
          transform:[{
            translateY: p.anim.interpolate({ inputRange:[0,1], outputRange:[0, 300 + Math.random()*150] }),
          },{
            rotate: p.anim.interpolate({ inputRange:[0,1], outputRange:['0deg',`${360*3}deg`] }),
          }],
          opacity: p.anim.interpolate({ inputRange:[0,0.7,1], outputRange:[1,1,0] }),
        }} />
      ))}
    </View>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, treinoConcluido, caloriasIngeridas, onNavigate, treinosLog, aguaMl, aguaServingMl, onBeberAgua, onDesfazerAgua, onChangeServing, onAddCustomMl, aguaGoalLog, weekReport, weekReportDismissed, onDismissWeekReport, cardioLog, cardioWeekGoal, setCardioWeekGoal, sonoLog, rpeLog, jejumAtivo, jejumStart, jejumJanela, setJejumAtivo, setJejumStart, setJejumJanela, jejumHistory, setJejumHistory, domsLog }) {
  const [showCal, setShowCal] = useState(false);
  const [aguaCustomInput, setAguaCustomInput] = useState('');
  const { C, styles } = useTheme();
  const screenAnim = useScreenAnimation();
  const meal  = MEALS[user.objetivo];
  const meta  = meal.calorias;
  const pct   = Math.min(caloriasIngeridas / meta, 1);
  const hoje  = new Date();
  const dias  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const semana = Array.from({ length:7 }, (_,i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - 6 + i);
    d.setHours(0,0,0,0);
    const isToday = i === 6;
    const ativo = isToday ? treinoConcluido : (treinosLog || []).some(log => {
      const ld = new Date(log); ld.setHours(0,0,0,0);
      return ld.getTime() === d.getTime();
    });
    return { dia:dias[d.getDay()], ativo };
  });

  const streak    = calcStreak(treinosLog);
  const objColors = { Emagrecimento:C.orange, 'Ganho de Massa':C.accent, Condicionamento:C.blue };
  const cor       = objColors[user.objetivo] || C.accent;
  const pesoNum   = parseFloat(user.peso);
  const protTarget  = Math.round(user.objetivo === 'Ganho de Massa' ? pesoNum*2 : user.objetivo === 'Condicionamento' ? pesoNum*1.5 : pesoNum*1.2);
  const gordTarget  = Math.round((meta*0.25)/9);
  const carboTarget = Math.round(Math.max(0,(meta - protTarget*4 - gordTarget*9)/4));
  const ratio       = Math.min(caloriasIngeridas/meta, 1);
  const macros = [
    { label:'Proteínas',    val:Math.round(protTarget*ratio),  total:protTarget,  color:C.accent },
    { label:'Carboidratos', val:Math.round(carboTarget*ratio), total:carboTarget, color:C.orange },
    { label:'Gorduras',     val:Math.round(gordTarget*ratio),  total:gordTarget,  color:C.purple },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom:24 }}>
      <Animated.View style={screenAnim}>
      <View style={styles.dashHeader}>
        <View style={{ flex:1 }}>
          <Text style={styles.dashSaudacao}>{getSaudacao()},</Text>
          <Text style={styles.dashGreet}>{user.nome} 👋</Text>
          <View style={[styles.objetivoBadge, { borderColor:cor, marginTop:6 }]}>
            <Text style={[styles.objetivoText, { color:cor }]}>🎯 {user.objetivo}</Text>
          </View>
        </View>
        <View style={{ alignItems:'flex-end', gap:8 }}>
          <AvatarImg uri={user.photoUri} name={user.nome} size={48} fontSize={20} />
          <TouchableOpacity style={{ backgroundColor:C.card2, borderRadius:10, padding:6, borderWidth:1, borderColor:C.border }} onPress={() => setShowCal(true)}>
            <Ionicons name="calendar-outline" size={18} color={C.muted} />
          </TouchableOpacity>
        </View>
      </View>
      <CalendarioModal visible={showCal} onClose={() => setShowCal(false)} treinosLog={treinosLog} aguaGoalLog={aguaGoalLog} />

      {weekReport && !weekReportDismissed && (
        <View style={styles.reportCard}>
          <View style={[styles.row, { justifyContent:'space-between', marginBottom:4 }]}>
            <Text style={styles.reportTitle}>📋 Semana Passada</Text>
            <TouchableOpacity onPress={onDismissWeekReport}><Ionicons name="close" size={18} color={C.muted} /></TouchableOpacity>
          </View>
          <Text style={styles.reportSub}>{weekReport.de} a {weekReport.ate}</Text>
          <View style={[styles.row, { gap:8 }]}>
            <View style={[styles.reportStat, { backgroundColor:C.accent+'14', borderWidth:1, borderColor:C.accent+'30' }]}>
              <Text style={[styles.reportStatVal, { color:C.accent }]}>{weekReport.treinos}</Text>
              <Text style={styles.reportStatLabel}>Treinos</Text>
            </View>
            {weekReport.avgCals ? (
              <View style={[styles.reportStat, { backgroundColor:C.orange+'14', borderWidth:1, borderColor:C.orange+'30' }]}>
                <Text style={[styles.reportStatVal, { color:C.orange }]}>{weekReport.avgCals}</Text>
                <Text style={styles.reportStatLabel}>Kcal/dia média</Text>
              </View>
            ) : null}
            <View style={[styles.reportStat, { backgroundColor:C.blue+'14', borderWidth:1, borderColor:C.blue+'30' }]}>
              <Text style={[styles.reportStatVal, { color:C.blue }]}>
                {weekReport.treinos >= 5 ? '🔥' : weekReport.treinos >= 3 ? '👍' : '💪'}
              </Text>
              <Text style={styles.reportStatLabel}>
                {weekReport.treinos >= 5 ? 'Excelente!' : weekReport.treinos >= 3 ? 'Bom ritmo!' : 'Continue!'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Score de Prontidão ── */}
      {(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const yest  = new Date(today); yest.setDate(today.getDate()-1);
        const yKey  = `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`;
        const lastSono = (sonoLog||[]).slice(-1)[0];
        const sonoScore = !lastSono ? 50 : lastSono.horas>=8?100:lastSono.horas>=7?85:lastSono.horas>=6?60:lastSono.horas>=5?35:10;
        const hydScore  = (aguaGoalLog||[]).includes(yKey) ? 100 : 45;
        const logs = [...(treinosLog||[])].sort().reverse();
        const lastT = logs[0];
        let recovScore = 85;
        if (lastT) {
          const dt = new Date(lastT); dt.setHours(0,0,0,0);
          const days = Math.round((today - dt) / 86400000);
          recovScore = days===0?60:days===1?80:days===2?95:100;
          if (days===0) {
            let consec=0; for(const d of logs){const x=new Date(d);x.setHours(0,0,0,0);const exp=new Date(today);exp.setDate(today.getDate()-consec);exp.setHours(0,0,0,0);if(x.getTime()===exp.getTime())consec++;else break;}
            if(consec>=3) recovScore=35; else if(consec>=2) recovScore=50;
          }
        }
        const score  = Math.round(sonoScore*0.4 + hydScore*0.2 + recovScore*0.4);
        const clr    = score>=80?C.accent:score>=60?C.blue:score>=40?C.orange:C.danger;
        const emoji  = score>=80?'🟢':score>=60?'🔵':score>=40?'🟠':'🔴';
        const label  = score>=80?'Pronto para treinar pesado!':score>=60?'Bom para treino moderado':score>=40?'Considere treino leve':';Priorize o descanso hoje';
        return (
          <View style={[styles.card, { marginBottom:10, borderLeftWidth:4, borderLeftColor:clr }]}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:8 }]}>
              <Text style={[styles.sectionTitle2, { margin:0 }]}>⚡ Prontidão do Dia</Text>
              <View style={{ backgroundColor:clr+'22', borderRadius:20, paddingHorizontal:12, paddingVertical:4 }}>
                <Text style={{ color:clr, fontWeight:'900', fontSize:20 }}>{score}</Text>
              </View>
            </View>
            <Text style={{ color:clr, fontWeight:'700', fontSize:13, marginBottom:8 }}>{emoji} {label}</Text>
            <View style={[styles.row, { gap:8 }]}>
              {[['😴',Math.round(sonoScore),'Sono'],['💧',Math.round(hydScore),'Hidrat.'],['🔋',Math.round(recovScore),'Recuper.']].map(([e,v,l])=>(
                <View key={l} style={{ flex:1, alignItems:'center', backgroundColor:C.card2, borderRadius:10, paddingVertical:6 }}>
                  <Text style={{ fontSize:14 }}>{e}</Text>
                  <Text style={{ color:C.text, fontWeight:'800', fontSize:13 }}>{v}</Text>
                  <Text style={{ color:C.muted, fontSize:9 }}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })()}

      {streak > 0 && (
        <View style={[styles.card, styles.row, { paddingVertical:12, marginBottom:10 }]}>
          <View style={[styles.streakIcon, { backgroundColor:C.orange+'22' }]}>
            <Ionicons name="flame" size={20} color={C.orange} />
          </View>
          <View style={{ marginLeft:12, flex:1 }}>
            <Text style={[styles.summaryVal, { fontSize:16 }]}>{streak} dia{streak>1?'s':''} consecutivo{streak>1?'s':''} 🔥</Text>
            <Text style={styles.summaryLabel}>Continue assim, vai lá!</Text>
          </View>
        </View>
      )}

      {/* Cardio week goal */}
      {(() => {
        const monday = getMonday(new Date());
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        const thisWeekCardio = (cardioLog || []).filter(s => {
          const d = new Date(s.date); return d >= monday && d <= sunday;
        }).length;
        const pctC = Math.min(thisWeekCardio / (cardioWeekGoal||3), 1);
        return (
          <TouchableOpacity
            style={[styles.card, { marginBottom:10 }]}
            activeOpacity={0.8}
            onPress={() => setCardioWeekGoal(g => g >= 7 ? 1 : (g||3) + 1)}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:8 }]}>
              <Text style={[styles.sectionTitle, { marginBottom:0 }]}>🚴 Meta Cardio Semanal</Text>
              <Text style={{ color:C.accent, fontWeight:'900', fontSize:15 }}>
                {thisWeekCardio}/{cardioWeekGoal} sessões
              </Text>
            </View>
            <View style={[styles.progressBar, { height:10, borderRadius:5 }]}>
              <View style={[styles.progressFill, { width:`${pctC*100}%`, backgroundColor:C.blue, borderRadius:5 }]} />
            </View>
            <Text style={[styles.muted, { fontSize:11, marginTop:6 }]}>
              {pctC >= 1 ? '✅ Meta atingida esta semana!' : `Toque para ajustar a meta (atual: ${cardioWeekGoal}x/semana)`}
            </Text>
          </TouchableOpacity>
        );
      })()}

      <View style={styles.row}>
        <View style={[styles.summaryCard, { flex:1, marginRight:6 }]}>
          <Ionicons name="flame" size={22} color={C.orange} style={{ marginBottom:6 }} />
          <Text style={styles.summaryVal}>{caloriasIngeridas}</Text>
          <Text style={styles.summaryLabel}>de {meta} kcal</Text>
          <View style={styles.miniBar}><View style={[styles.miniBarFill, { width:`${pct*100}%`, backgroundColor:cor }]} /></View>
        </View>
        <View style={[styles.summaryCard, { flex:1, marginLeft:6 }]}>
          <Ionicons name="scale-outline" size={22} color={C.blue} style={{ marginBottom:6 }} />
          <Text style={styles.summaryVal}>{user.peso}kg</Text>
          <Text style={styles.summaryLabel}>Peso atual</Text>
          <View style={[styles.statusPill, { backgroundColor:treinoConcluido ? C.accent+'22' : C.orange+'22' }]}>
            <Text style={[styles.statusPillText, { color:treinoConcluido ? C.accent : C.orange }]}>{treinoConcluido ? '✔ Treino feito' : '⏳ Treinar hoje'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.actionBtn, { flex:1, marginRight:6, backgroundColor:cor+'22', borderColor:cor }]} onPress={() => onNavigate('treino')}>
          <Ionicons name="barbell-outline" size={15} color={cor} style={{ marginRight:6 }} />
          <Text style={[styles.actionBtnText, { color:cor }]}>Iniciar Treino</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { flex:1, marginLeft:6, backgroundColor:C.blue+'22', borderColor:C.blue }]} onPress={() => onNavigate('dieta')}>
          <Ionicons name="restaurant-outline" size={15} color={C.blue} style={{ marginRight:6 }} />
          <Text style={[styles.actionBtnText, { color:C.blue }]}>Ver Dieta</Text>
        </TouchableOpacity>
      </View>

      {/* ── Dica do Dia ── */}
      <View style={[styles.card, { marginBottom:10, backgroundColor:C.accent+'10', borderWidth:1, borderColor:C.accent+'30' }]}>
        <View style={[styles.row, { marginBottom:6 }]}>
          <Ionicons name="bulb-outline" size={16} color={C.accent} style={{ marginRight:6 }} />
          <Text style={{ color:C.accent, fontWeight:'800', fontSize:12 }}>DICA DO DIA</Text>
        </View>
        <Text style={{ color:C.text, fontSize:13, lineHeight:19 }}>{getDicaDia()}</Text>
      </View>

      {/* ── Jejum Intermitente ── */}
      <JejumCard
        jejumAtivo={jejumAtivo} jejumStart={jejumStart} jejumJanela={jejumJanela}
        setJejumAtivo={setJejumAtivo} setJejumStart={setJejumStart} setJejumJanela={setJejumJanela}
        jejumHistory={jejumHistory} setJejumHistory={setJejumHistory}
      />

      {/* ── DOMS rápido ── */}
      {domsLog && domsLog.length > 0 && (() => {
        const last = domsLog[domsLog.length - 1];
        const domsAltos = Object.entries(last.musculos||{}).filter(([,v]) => v >= 3).map(([k]) => k);
        if (!domsAltos.length) return null;
        return (
          <View style={[styles.card, { marginBottom:10, borderLeftWidth:3, borderLeftColor:C.orange }]}>
            <View style={[styles.row, { marginBottom:4 }]}>
              <Ionicons name="fitness-outline" size={14} color={C.orange} style={{ marginRight:6 }} />
              <Text style={{ color:C.orange, fontWeight:'700', fontSize:12 }}>RECUPERAÇÃO</Text>
            </View>
            <Text style={{ color:C.muted, fontSize:12 }}>Músculos com dor moderada/alta: {domsAltos.join(', ')}</Text>
          </View>
        );
      })()}

      <Text style={styles.sectionTitle}>📅 Semana Atual</Text>
      <View style={[styles.card, styles.row, { justifyContent:'space-around', paddingVertical:16 }]}>
        {semana.map((d,i) => (
          <View key={i} style={{ alignItems:'center', gap:6 }}>
            <View style={[styles.weekDot, d.ativo && { backgroundColor:cor }]}>
              {d.ativo && <Ionicons name="checkmark" size={10} color={C.bg} />}
            </View>
            <Text style={[styles.weekDay, d.ativo && { color:cor, fontWeight:'600' }]}>{d.dia}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>🥗 Macronutrientes</Text>
      <View style={styles.card}>
        {macros.map(m => (
          <View key={m.label} style={{ marginBottom:12 }}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:6 }]}>
              <Text style={styles.macroLabel}>{m.label}</Text>
              <Text style={[styles.macroVal, { color:m.color }]}>{m.val}g / {m.total}g</Text>
            </View>
            <View style={styles.progressBar}><View style={[styles.progressFill, { width:`${m.total>0?(m.val/m.total)*100:0}%`, backgroundColor:m.color }]} /></View>
          </View>
        ))}
      </View>

      {/* Hidratação */}
      {(() => {
        const meta   = calcMetaAgua(user);
        const pctH   = Math.min(aguaMl / meta, 1);
        const falta  = Math.max(meta - aguaMl, 0);
        const porcoes= aguaMl > 0 ? Math.round(aguaMl / aguaServingMl) : 0;
        const SERVING_OPTIONS = [150, 200, 250, 300, 500, 850, 1000];
        return (
          <>
            <Text style={styles.sectionTitle}>💧 Hidratação Diária</Text>
            <View style={styles.card}>
              {/* Header: consumido / meta */}
              <View style={[styles.row, { justifyContent:'space-between', marginBottom:4 }]}>
                <View>
                  <Text style={[styles.summaryVal, { fontSize:22, color:C.blue }]}>{fmtLitros(aguaMl)}</Text>
                  <Text style={styles.summaryLabel}>de {fmtLitros(meta)} ({porcoes} {porcoes===1?'porção':'porções'})</Text>
                </View>
                <View style={{ alignItems:'flex-end' }}>
                  <Text style={{ color:pctH >= 1 ? C.accent : C.muted, fontWeight:'700', fontSize:13 }}>
                    {pctH >= 1 ? '✅ Meta atingida!' : `Faltam ${fmtLitros(falta)}`}
                  </Text>
                  <Text style={[styles.muted, { fontSize:11, marginTop:2 }]}>
                    {user.objetivo === 'Ganho de Massa' ? '50ml/kg · Ganho' : user.objetivo === 'Condicionamento' ? '45ml/kg · Condic.' : '37ml/kg · Emagr.'}
                  </Text>
                </View>
              </View>

              {/* Barra de progresso */}
              <View style={[styles.progressBar, { height:10, borderRadius:5, marginBottom:14, marginTop:6 }]}>
                <View style={[styles.progressFill, { width:`${pctH*100}%`, height:10, borderRadius:5, backgroundColor:C.blue }]} />
              </View>

              {/* Seletor de porção */}
              <Text style={[styles.muted, { marginBottom:8, fontSize:12 }]}>Tamanho da porção:</Text>
              <View style={[styles.row, { gap:6, marginBottom:14, flexWrap:'wrap' }]}>
                {SERVING_OPTIONS.map(ml => (
                  <TouchableOpacity key={ml}
                    style={{ paddingVertical:6, paddingHorizontal:12, borderRadius:20, borderWidth:1.5,
                      borderColor: aguaServingMl === ml ? C.blue : C.border,
                      backgroundColor: aguaServingMl === ml ? C.blue+'22' : C.card2 }}
                    onPress={() => onChangeServing(ml)}>
                    <Text style={{ color: aguaServingMl === ml ? C.blue : C.muted, fontWeight:'700', fontSize:12 }}>
                      {ml >= 1000 ? `${ml/1000}L` : `${ml}ml`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quantidade personalizada */}
              <View style={[styles.row, { gap:8, marginBottom:12 }]}>
                <TextInput
                  style={[styles.input, { flex:1, paddingVertical:10, paddingHorizontal:14, fontSize:14, marginTop:0 }]}
                  placeholder="Quantidade personalizada (ml)"
                  placeholderTextColor={C.muted}
                  value={aguaCustomInput}
                  onChangeText={setAguaCustomInput}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={{ backgroundColor:C.blue, borderRadius:16, paddingHorizontal:16, height:46, alignItems:'center', justifyContent:'center', elevation:2, shadowColor:C.blue, shadowOffset:{width:0,height:3}, shadowOpacity:0.30, shadowRadius:5 }}
                  onPress={() => {
                    const ml = parseInt(aguaCustomInput, 10);
                    if (!ml || ml <= 0 || ml > 5000) { return; }
                    onAddCustomMl(ml);
                    setAguaCustomInput('');
                  }}>
                  <Text style={{ color:'#fff', fontWeight:'800', fontSize:14 }}>+ Adicionar</Text>
                </TouchableOpacity>
              </View>

              {/* Botões de ação */}
              <View style={[styles.row, { gap:10 }]}>
                <TouchableOpacity
                  style={[styles.bigBtn, { flex:1, marginTop:0, backgroundColor: pctH >= 1 ? C.accent+'44' : C.blue, flexDirection:'row' }]}
                  onPress={onBeberAgua}>
                  <Text style={{ fontSize:16, marginRight:6 }}>💧</Text>
                  <Text style={[styles.bigBtnText, { color: pctH >= 1 ? C.accent : '#fff' }]}>
                    Beber {aguaServingMl}ml
                  </Text>
                </TouchableOpacity>
                {aguaMl > 0 && (
                  <TouchableOpacity
                    style={[styles.outlineBtn, { marginTop:0, paddingHorizontal:16 }]}
                    onPress={onDesfazerAgua}>
                    <Ionicons name="arrow-undo-outline" size={18} color={C.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        );
      })()}

      <View style={[styles.card, { borderLeftWidth:3, borderLeftColor:cor, paddingLeft:14 }]}>
        <Text style={styles.dicaTitle}>💡 Dica do Dia</Text>
        <Text style={styles.dicaText}>
          {user.objetivo === 'Emagrecimento' ? 'Beba pelo menos 2,5L de água hoje! A hidratação acelera o metabolismo e reduz a fome.'
            : user.objetivo === 'Ganho de Massa' ? 'Consuma proteínas até 30min após o treino para maximizar a síntese muscular!'
            : 'Mantenha constância nos treinos — a regularidade é mais importante que a intensidade.'}
        </Text>
      </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── TREINO ───────────────────────────────────────────────────────────────────
function TreinoScreen({ user, concluido, onConcluir, exChecked, setExChecked, exSets, setExSets, onSaveNota, treinosCustom, setTreinosCustom, treinoAtivo, setTreinoAtivo, exSubst, setExSubst, setHistory, sessionsHistory, treinosLog, cardioLog, setCardioLog, prRecords, plannerSemana, setPlannerSemana, mesocicloStart, setMesocicloStart, domsLog, setDomsLog, lesoes }) {
  const { C, styles } = useTheme();
  const screenAnim = useScreenAnimation();
  const presetWorkout  = WORKOUTS[user.objetivo]?.[user.nivel];
  const customWorkout  = treinoAtivo ? (treinosCustom||[]).find(t => t.id === treinoAtivo) : null;
  const workout        = customWorkout || presetWorkout;

  // Custom workout manager state
  const [showCustList, setShowCustList] = useState(false);
  const [showCustEdit, setShowCustEdit] = useState(false);
  const [editingWk, setEditingWk]       = useState(null);
  const [editWkName, setEditWkName]     = useState('');
  const [editWkTime, setEditWkTime]     = useState('45');
  const [editWkExs, setEditWkExs]       = useState([{n:'',s:''}]);

  const openNewWorkout = () => { setEditingWk(null); setEditWkName(''); setEditWkTime('45'); setEditWkExs([{n:'',s:''}]); setShowCustEdit(true); };
  const openEditWorkout = (wk) => { setEditingWk(wk); setEditWkName(wk.name); setEditWkTime(String(wk.time).replace(' min','')); setEditWkExs([...wk.exercises]); setShowCustEdit(true); };
  const saveCustomWorkout = () => {
    const exs = editWkExs.filter(e => e.n.trim());
    if (!editWkName.trim() || !exs.length) { Alert.alert('Atenção','Preencha o nome e pelo menos 1 exercício.'); return; }
    const wk = { id: editingWk?.id || Date.now().toString(), name:editWkName.trim(), time:`${editWkTime||'45'} min`, exercises:exs };
    setTreinosCustom(prev => editingWk ? prev.map(t => t.id===wk.id?wk:t) : [...prev,wk]);
    setShowCustEdit(false);
  };
  const deleteCustomWorkout = (id) => {
    Alert.alert('Excluir treino','Tem certeza?',[{text:'Cancelar',style:'cancel'},{text:'Excluir',style:'destructive',onPress:()=>{ setTreinosCustom(prev=>prev.filter(t=>t.id!==id)); if(treinoAtivo===id) setTreinoAtivo(null); }}]);
  };

  const [showModal, setShowModal]     = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapIdx, setSwapIdx]         = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSec, setTimerSec]     = useState(0);
  const timerRef                    = useRef(null);

  const [showSetModal, setShowSetModal]   = useState(false);
  const [curExIdx, setCurExIdx]           = useState(null);
  const [setRepsInput, setSetRepsInput]   = useState('');
  const [setPesoInput, setSetPesoInput]   = useState('');

  const [showRestModal, setShowRestModal] = useState(false);
  const [restSec, setRestSec]             = useState(0);
  const [restActive, setRestActive]       = useState(false);
  const restRef                           = useRef(null);

  const [activeExTimer, setActiveExTimer] = useState(null);
  const [exTimerSec, setExTimerSec]       = useState({});
  const exTimerRef                        = useRef(null);

  // Guided mode states
  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedIdx,  setGuidedIdx]  = useState(0);

  // RPE modal state
  const [showRpeModal, setShowRpeModal] = useState(false);
  const [rpeVal, setRpeVal]             = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showDomsModal, setShowDomsModal] = useState(false);
  const [domsRating, setDomsRating]     = useState({});
  const [showGerador, setShowGerador]   = useState(false);
  const [genEquip, setGenEquip]         = useState(GEN_EQUIPAMENTOS[0]);
  const [genGrupo, setGenGrupo]         = useState(GEN_GRUPOS[0]);
  const [genTempo, setGenTempo]         = useState(GEN_TEMPO[1]);
  const [genResult, setGenResult]       = useState(null);

  // Planner state
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [plannerDayIdx, setPlannerDayIdx]       = useState(null);
  const [plannerSelTreino, setPlannerSelTreino] = useState(null);
  const [plannerSelGrupo, setPlannerSelGrupo]   = useState(null);

  const openPlanner = (dayIdx) => {
    const day = getPlanDay(plannerSemana, dayIdx);
    setPlannerDayIdx(dayIdx);
    setPlannerSelTreino(day.treino);
    setPlannerSelGrupo(day.grupo);
    setShowPlannerModal(true);
  };

  // HIIT state
  const [hiitMode, setHiitMode]         = useState(false);
  const [hiitWork, setHiitWork]         = useState('40');
  const [hiitRest, setHiitRest]         = useState('20');
  const [hiitRounds, setHiitRounds]     = useState('8');
  const [hiitElapsed, setHiitElapsed]   = useState(0);
  const [hiitRunning, setHiitRunning]   = useState(false);
  const hiitRef                         = useRef(null);

  // Cardio states
  const [cardioActivity, setCardioActivity] = useState('corrida');
  const [cardioDist, setCardioDist]         = useState('');
  const [cardioActive, setCardioActive]     = useState(false);
  const [cardioSec, setCardioSec]           = useState(0);
  const cardioRef                           = useRef(null);

  // GPS distance states
  const [routeCoords, setRouteCoords]   = useState([]);
  const [gpsDistKm, setGpsDistKm]       = useState(0);
  const locationSub                     = useRef(null);

  useEffect(() => {
    if (timerActive) { timerRef.current = setInterval(() => setTimerSec(s => s+1), 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  useEffect(() => {
    if (activeExTimer !== null) {
      exTimerRef.current = setInterval(() => {
        setExTimerSec(prev => ({ ...prev, [activeExTimer]: (prev[activeExTimer] || 0) + 1 }));
      }, 1000);
    } else { clearInterval(exTimerRef.current); }
    return () => clearInterval(exTimerRef.current);
  }, [activeExTimer]);

  useEffect(() => {
    if (cardioActive) { cardioRef.current = setInterval(() => setCardioSec(s => s+1), 1000); }
    else { clearInterval(cardioRef.current); }
    return () => clearInterval(cardioRef.current);
  }, [cardioActive]);

  useEffect(() => {
    if (cardioActive) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const init = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setRouteCoords(prev => prev.length === 0 ? [init] : prev);
          locationSub.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
            (l) => {
              const coord = { latitude: l.coords.latitude, longitude: l.coords.longitude };
              setRouteCoords(prev => {
                const next = [...prev, coord];
                setGpsDistKm(calcRouteKm(next));
                return next;
              });
            }
          );
        } catch (_) {}
      })();
    } else {
      locationSub.current?.remove();
      locationSub.current = null;
    }
    return () => { locationSub.current?.remove(); locationSub.current = null; };
  }, [cardioActive]);

  useEffect(() => {
    if (hiitRunning) {
      const work = Math.max(parseInt(hiitWork)||40, 5);
      const rest = Math.max(parseInt(hiitRest)||20, 5);
      const rounds = Math.max(parseInt(hiitRounds)||8, 1);
      const total = (work + rest) * rounds;
      hiitRef.current = setInterval(() => {
        setHiitElapsed(s => {
          if (s + 1 >= total) {
            clearInterval(hiitRef.current);
            setHiitRunning(false);
            try { Vibration.vibrate([0,400,150,400,150,600]); } catch(_) {}
            Alert.alert('🎉 HIIT Concluído!', `${rounds} rounds completados!`);
            return total;
          }
          const next = s + 1;
          const roundDur = work + rest;
          const inRound  = next % roundDur;
          if (inRound === 0 || inRound === work) {
            try { Vibration.vibrate(inRound === 0 ? [0,200,80,200] : [0,100]); } catch(_) {}
          }
          return next;
        });
      }, 1000);
    } else { clearInterval(hiitRef.current); }
    return () => clearInterval(hiitRef.current);
  }, [hiitRunning]);

  const registrarCardio = () => {
    const timeMins = cardioSec / 60;
    if (timeMins < 0.5 && !cardioDist && gpsDistKm === 0) { Alert.alert('Atenção', 'Registre pelo menos 30 segundos de atividade.'); return; }
    const act = CARDIO_ACTIVITIES.find(a => a.id === cardioActivity);
    const kcal = calcCardioKcal(act.met, parseFloat(user.peso) || 70, timeMins);
    const dist = gpsDistKm > 0 ? gpsDistKm : (parseFloat(cardioDist) || null);
    const routeSnapshot = routeCoords.length > 1 ? routeCoords : null;
    const entry = {
      id: Date.now().toString(),
      date: todayKey(),
      activity: cardioActivity,
      emoji: act.emoji,
      label: act.label,
      distKm: dist,
      timeMins: Math.round(timeMins * 10) / 10,
      timeSec: cardioSec,
      kcal,
      route: routeSnapshot,
    };
    setCardioLog(prev => [entry, ...prev].slice(0, 50));
    setCardioSec(0); setCardioActive(false); setCardioDist('');
    setRouteCoords([]); setGpsDistKm(0);
    try { Vibration.vibrate([0,100,60,200]); } catch(_) {}
    Alert.alert('✅ Atividade registrada!', `${act.emoji} ${act.label}: ${kcal} kcal${dist ? ` · ${dist.toFixed(2)}km` : ''}`);
  };

  useEffect(() => {
    if (restActive && restSec > 0) {
      restRef.current = setInterval(() => {
        setRestSec(s => {
          if (s <= 1) {
            clearInterval(restRef.current);
            setRestActive(false);
            setShowRestModal(false);
            try { Vibration.vibrate([0,300,100,300,100,300]); } catch (_) {}
            Alert.alert('⏰ Descanso Finalizado!', 'Hora de voltar para o treino!');
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else { clearInterval(restRef.current); }
    return () => clearInterval(restRef.current);
  }, [restActive]);

  const openSetModal = (idx) => { setCurExIdx(idx); setSetRepsInput(''); setSetPesoInput(''); setShowSetModal(true); };

  const saveSet = () => {
    const reps = parseInt(setRepsInput, 10);
    if (isNaN(reps) || reps <= 0) { Alert.alert('Atenção', 'Informe um número válido de repetições.'); return; }
    const newSet = { id:Date.now().toString(), reps, peso:setPesoInput.trim() || null };
    setExSets(prev => ({ ...prev, [curExIdx]:[ ...(prev[curExIdx] || []), newSet ] }));
    setShowSetModal(false);
  };

  const startRest = (seconds) => { setRestSec(seconds); setRestActive(true); setShowRestModal(true); };

  const isCardio = treinoAtivo === '__cardio__';
  if (!workout && !isCardio) return <View style={styles.screen}><Text style={styles.muted}>Treino não encontrado.</Text></View>;

  const feitos = workout ? Object.values(exChecked).filter(Boolean).length : 0;
  const total  = workout ? workout.exercises.length : 0;
  const pct    = total > 0 ? feitos/total : 0;
  const actCardio = CARDIO_ACTIVITIES.find(a => a.id === cardioActivity) || CARDIO_ACTIVITIES[0];
  const cardioTimeMins = cardioSec / 60;
  const cardioKcalEst = calcCardioKcal(actCardio.met, parseFloat(user.peso) || 70, cardioTimeMins);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom:24 }}>
      <Animated.View style={screenAnim}>
      {/* ── Planejador Semanal ── */}
      {(() => {
        const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        const todayDow = new Date().getDay();
        return (
          <View style={[styles.card, { marginBottom:12, paddingVertical:12 }]}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:10 }]}>
              <Text style={[styles.sectionTitle2, { margin:0 }]}>📅 Semana</Text>
              <TouchableOpacity onPress={() => openPlanner(todayDow)}>
                <Text style={{ color:C.accent, fontSize:12, fontWeight:'700' }}>Editar</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.row, { justifyContent:'space-between' }]}>
              {DIAS.map((d, i) => {
                const { treino, grupo } = getPlanDay(plannerSemana, i);
                const gInfo = GRUPOS_MUSCULARES.find(g => g.id === grupo);
                const isToday = i === todayDow;
                const isDescanso = treino === 'descanso';
                const hasAny = !!(treino || grupo);
                const circleBg = isToday ? C.accent
                  : gInfo ? gInfo.cor + '33'
                  : isDescanso ? C.card2
                  : hasAny ? C.accent+'22' : C.card2;
                const circleBorder = isToday ? 'transparent'
                  : gInfo ? gInfo.cor
                  : hasAny ? C.accent+'44' : C.border;
                return (
                  <TouchableOpacity key={i} onPress={() => openPlanner(i)} style={{ alignItems:'center', flex:1 }}>
                    <View style={{ width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center', marginBottom:3,
                      backgroundColor: circleBg, borderWidth:1.5, borderColor: circleBorder }}>
                      {isDescanso
                        ? <Text style={{ fontSize:12 }}>🛌</Text>
                        : gInfo
                          ? <Text style={{ fontSize:8, fontWeight:'900', color: isToday ? C.bg : gInfo.cor }}>{gInfo.abbr}</Text>
                          : treino === '__cardio__'
                            ? <Text style={{ fontSize:11 }}>🏃</Text>
                            : treino
                              ? <Text style={{ fontSize:8, fontWeight:'800', color: isToday ? C.bg : C.accent }}>💪</Text>
                              : <Text style={{ fontSize:9, color:C.muted }}>—</Text>}
                    </View>
                    <Text style={{ fontSize:9, color: isToday ? C.accent : C.muted, fontWeight: isToday ? '800' : '400' }}>{d}</Text>
                    {gInfo && !isToday && (
                      <Text style={{ fontSize:7, color: gInfo.cor, fontWeight:'700', marginTop:1 }}>{gInfo.abbr}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Seletor de treino */}
      <View style={styles.workoutSelector}>
        <TouchableOpacity style={[styles.workoutSelectorTab, (!treinoAtivo) && styles.workoutSelectorActive]} onPress={() => setTreinoAtivo(null)}>
          <Text style={[styles.subTabText, (!treinoAtivo) && styles.subTabTextActive]}>Padrão</Text>
        </TouchableOpacity>
        {(treinosCustom||[]).map(t => (
          <TouchableOpacity key={t.id} style={[styles.workoutSelectorTab, treinoAtivo===t.id && styles.workoutSelectorActive]} onPress={() => setTreinoAtivo(t.id)}>
            <Text style={[styles.subTabText, treinoAtivo===t.id && styles.subTabTextActive]} numberOfLines={1}>{t.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.workoutSelectorTab, isCardio && styles.workoutSelectorActive]} onPress={() => setTreinoAtivo('__cardio__')}>
          <Text style={[styles.subTabText, isCardio && styles.subTabTextActive]}>🏃 Cardio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.workoutSelectorTab]} onPress={() => setShowGerador(true)}>
          <Ionicons name="flash-outline" size={16} color={C.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.workoutSelectorTab]} onPress={() => setShowCustList(true)}>
          <Ionicons name="settings-outline" size={16} color={C.muted} />
        </TouchableOpacity>
      </View>

      {/* ── CARDIO SECTION ── */}
      {isCardio && (
        <>

          <View style={[styles.card, { marginBottom:14 }]}>
            <Text style={[styles.sectionTitle2, { marginBottom:12 }]}>🏃 Atividade Cardiovascular</Text>

            {/* Activity selector */}
            <View style={styles.cardioActRow}>
              {CARDIO_ACTIVITIES.map(a => (
                <TouchableOpacity key={a.id} style={[styles.cardioActChip, cardioActivity===a.id && styles.cardioActChipOn]}
                  onPress={() => !cardioActive && setCardioActivity(a.id)}>
                  <Text style={{ fontSize:18 }}>{a.emoji}</Text>
                  <Text style={[styles.cardioActLabel, cardioActivity===a.id && styles.cardioActLabelOn]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* HIIT toggle */}
            <View style={[styles.row, { justifyContent:'center', marginBottom:10, gap:8 }]}>
              <TouchableOpacity onPress={() => { setHiitMode(false); setHiitRunning(false); setHiitElapsed(0); }}
                style={{ flex:1, paddingVertical:8, borderRadius:10, alignItems:'center',
                  backgroundColor: !hiitMode ? C.accent+'22' : C.card2, borderWidth:1, borderColor: !hiitMode ? C.accent : C.border }}>
                <Text style={{ color: !hiitMode ? C.accent : C.muted, fontWeight:'700', fontSize:13 }}>🕐 Cardio Livre</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setHiitMode(true); setCardioActive(false); setHiitRunning(false); setHiitElapsed(0); }}
                style={{ flex:1, paddingVertical:8, borderRadius:10, alignItems:'center',
                  backgroundColor: hiitMode ? C.orange+'22' : C.card2, borderWidth:1, borderColor: hiitMode ? C.orange : C.border }}>
                <Text style={{ color: hiitMode ? C.orange : C.muted, fontWeight:'700', fontSize:13 }}>⚡ HIIT</Text>
              </TouchableOpacity>
            </View>

            {hiitMode ? (() => {
              const work = Math.max(parseInt(hiitWork)||40, 5);
              const rest = Math.max(parseInt(hiitRest)||20, 5);
              const rounds = Math.max(parseInt(hiitRounds)||8, 1);
              const roundDur = work + rest;
              const total = roundDur * rounds;
              const currentRound = Math.min(Math.floor(hiitElapsed / roundDur) + 1, rounds);
              const inRound = hiitElapsed % roundDur;
              const phase = inRound < work ? 'work' : 'rest';
              const remaining = phase === 'work' ? work - inRound : roundDur - inRound;
              const done = hiitElapsed >= total && hiitElapsed > 0;
              return (
                <View>
                  {!hiitRunning && hiitElapsed === 0 && (
                    <View style={[styles.row, { gap:8, marginBottom:12 }]}>
                      {[['Esforço (s)', hiitWork, setHiitWork],['Descanso (s)', hiitRest, setHiitRest],['Rounds', hiitRounds, setHiitRounds]].map(([lbl,val,setter]) => (
                        <View key={lbl} style={{ flex:1 }}>
                          <Text style={[styles.muted, { fontSize:10, marginBottom:4, textAlign:'center' }]}>{lbl}</Text>
                          <TextInput style={[styles.input, { textAlign:'center', paddingVertical:8 }]} value={val} onChangeText={setter} keyboardType="numeric" />
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={{ alignItems:'center', marginBottom:12 }}>
                    {done ? (
                      <Text style={{ color:C.accent, fontSize:28, fontWeight:'900', marginBottom:6 }}>🎉 Concluído!</Text>
                    ) : (
                      <>
                        <Text style={{ color: phase==='work' ? C.orange : C.blue, fontSize:13, fontWeight:'700', marginBottom:4 }}>{phase==='work' ? '⚡ ESFORÇO' : '😮‍💨 DESCANSO'} — Round {currentRound}/{rounds}</Text>
                        <Text style={{ color: phase==='work' ? C.orange : C.blue, fontSize:72, fontWeight:'900', lineHeight:80 }}>{remaining}</Text>
                        <Text style={[styles.muted, { fontSize:11 }]}>segundos · {Math.round((hiitElapsed/total)*100)}% completo</Text>
                      </>
                    )}
                  </View>
                  <View style={[styles.row, { gap:8 }]}>
                    <TouchableOpacity style={[styles.bigBtn, { flex:1, backgroundColor: hiitRunning ? C.danger : C.orange, marginTop:0 }]}
                      onPress={() => { if (done) { setHiitElapsed(0); setHiitRunning(false); } else setHiitRunning(r => !r); }}>
                      <Text style={styles.bigBtnText}>{done ? 'Reiniciar' : hiitRunning ? '⏸ Pausar' : (hiitElapsed > 0 ? '▶ Retomar' : '▶ Iniciar')}</Text>
                    </TouchableOpacity>
                    {hiitElapsed > 0 && !hiitRunning && !done && (
                      <TouchableOpacity style={[styles.outlineBtn, { marginTop:0, paddingHorizontal:16 }]} onPress={() => setHiitElapsed(0)}>
                        <Text style={styles.outlineBtnText}>Zerar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })() : (
              <>
            {/* Live timer */}
            <Text style={styles.cardioTimerBig}>{formatTime(cardioSec)}</Text>
            <View style={[styles.row, { justifyContent:'center', gap:12, marginBottom:16 }]}>
              <TouchableOpacity style={[styles.timerBtn, { flex:1, backgroundColor: cardioActive ? C.danger : C.accent }]}
                onPress={() => setCardioActive(a => !a)}>
                <Text style={styles.timerBtnText}>{cardioActive ? '⏸ Pausar' : (cardioSec > 0 ? '▶ Retomar' : '▶ Iniciar')}</Text>
              </TouchableOpacity>
              {cardioSec > 0 && !cardioActive && (
                <TouchableOpacity style={[styles.outlineBtn, { marginTop:0, paddingHorizontal:20 }]}
                  onPress={() => { setCardioSec(0); setRouteCoords([]); setGpsDistKm(0); }}>
                  <Text style={styles.outlineBtnText}>Zerar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Stats: tempo, distância GPS ou manual, kcal */}
            <View style={styles.cardioStatRow}>
              <View style={styles.cardioStatCard}>
                <Text style={styles.cardioStatVal}>{Math.floor(cardioTimeMins)}:{String(Math.round((cardioTimeMins % 1) * 60)).padStart(2,'0')}</Text>
                <Text style={styles.cardioStatLabel}>minutos</Text>
              </View>
              <View style={[styles.cardioStatCard, gpsDistKm > 0 && { borderColor:C.blue }]}>
                {gpsDistKm > 0 ? (
                  <>
                    <Text style={[styles.cardioStatVal, { color:C.blue }]}>{gpsDistKm.toFixed(2)}</Text>
                    <Text style={styles.cardioStatLabel}>km (GPS)</Text>
                  </>
                ) : (
                  <>
                    <TextInput
                      style={[styles.cardioStatVal, { padding:0, width:'100%', textAlign:'center' }]}
                      placeholder="0.0"
                      placeholderTextColor={C.muted}
                      value={cardioDist}
                      onChangeText={setCardioDist}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.cardioStatLabel}>km (manual)</Text>
                  </>
                )}
              </View>
              <View style={[styles.cardioStatCard, { borderColor:C.accent, backgroundColor:C.accent+'10' }]}>
                <Text style={[styles.cardioStatVal, { color:C.accent }]}>{cardioTimeMins > 0 ? cardioKcalEst : '—'}</Text>
                <Text style={styles.cardioStatLabel}>kcal est.</Text>
              </View>
            </View>

            {cardioTimeMins > 0 && (
              <Text style={[styles.muted, { fontSize:10, textAlign:'center', marginBottom:10 }]}>
                {actCardio.met} MET × {user.peso}kg × {cardioTimeMins.toFixed(1)}min
              </Text>
            )}

            <TouchableOpacity style={styles.bigBtn} onPress={registrarCardio}>
              <View style={styles.row}>
                <Ionicons name="checkmark-circle" size={18} color={C.bg} style={{ marginRight:8 }} />
                <Text style={styles.bigBtnText}>Registrar Atividade</Text>
              </View>
            </TouchableOpacity>
            </>
            )}
          </View>

          {/* Histórico cardio */}
          {(cardioLog||[]).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>📋 Últimas Atividades</Text>
              {(cardioLog||[]).slice(0,10).map(entry => (
                <View key={entry.id} style={styles.cardioHistCard}>
                  <Text style={styles.cardioHistEmoji}>{entry.emoji}</Text>
                  <View style={styles.cardioHistInfo}>
                    <Text style={styles.cardioHistTitle}>{entry.label} — {entry.date}</Text>
                    <Text style={styles.cardioHistSub}>
                      {formatTime(entry.timeSec || Math.round(entry.timeMins * 60))}
                      {entry.distKm ? ` · ${Number(entry.distKm).toFixed(2)}km` : ''}
                      {entry.route ? ' · 📍 GPS' : ''}
                    </Text>
                  </View>
                  <Text style={styles.cardioHistKcal}>{entry.kcal} kcal</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}

      {/* ── TREINO REGULAR ── */}
      {!isCardio && <>

      {/* Timer */}
      <View style={styles.timerCard}>
        <View>
          <Text style={styles.timerDisplay}>{formatTime(timerSec)}</Text>
          <Text style={styles.timerLabel}>Tempo de Treino</Text>
        </View>
        <TouchableOpacity style={styles.timerBtn} onPress={() => setTimerActive(a => !a)}>
          <Text style={styles.timerBtnText}>{timerActive ? '⏸ Pausar' : (timerSec > 0 ? '▶ Retomar' : '▶ Iniciar')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Deload automático ── */}
      {!concluido && (() => {
        const today = new Date(); today.setHours(0,0,0,0);
        let consWeeks = 0;
        for (let i = 0; i < 6; i++) {
          const end = new Date(today); end.setDate(today.getDate() - i * 7);
          const start = new Date(end); start.setDate(end.getDate() - 6);
          const cnt = (treinosLog||[]).filter(d => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt >= start && dt <= end; }).length;
          if (cnt >= 3) consWeeks++; else break;
        }
        if (consWeeks < 4) return null;
        return (
          <View style={[styles.card, { borderColor:C.orange, borderWidth:1.5, marginBottom:14, flexDirection:'row', alignItems:'flex-start', gap:12 }]}>
            <Text style={{ fontSize:24 }}>😮‍💨</Text>
            <View style={{ flex:1 }}>
              <Text style={{ color:C.orange, fontWeight:'800', fontSize:14, marginBottom:2 }}>{consWeeks} semanas consecutivas de treino!</Text>
              <Text style={{ color:C.muted, fontSize:12, lineHeight:18 }}>Considere uma semana de deload: reduza as cargas em 40% e mantenha as repetições. A recuperação é parte essencial do progresso.</Text>
            </View>
          </View>
        );
      })()}

      {/* ── Mesociclo card ── */}
      {(() => {
        const fase = getMesocicloFase(mesocicloStart);
        if (!mesocicloStart) return (
          <TouchableOpacity style={[styles.card, { marginBottom:14, borderStyle:'dashed', borderWidth:1, borderColor:C.border, alignItems:'center', paddingVertical:12 }]}
            onPress={() => { Alert.alert('Iniciar Periodização?', 'O app vai guiar seu treino por fases: Adaptação → Hipertrofia → Força → Deload, em ciclos de 12 semanas.', [{ text:'Cancelar', style:'cancel'}, { text:'Iniciar agora', onPress:() => setMesocicloStart(new Date().toISOString().split('T')[0]) }]); }}>
            <Text style={{ color:C.muted, fontSize:12 }}>📆 Iniciar Periodização por Mesociclo</Text>
          </TouchableOpacity>
        );
        return (
          <View style={[styles.card, { marginBottom:14, borderLeftWidth:4, borderLeftColor:fase?.cor||C.accent }]}>
            <View style={[styles.row, { justifyContent:'space-between' }]}>
              <View>
                <Text style={{ color:C.muted, fontSize:11 }}>Ciclo {fase?.ciclo||1} · Semana {fase?.semana||1}/12</Text>
                <Text style={{ color:fase?.cor||C.accent, fontWeight:'800', fontSize:15, marginTop:2 }}>📆 Fase: {fase?.label||'—'}</Text>
              </View>
              <View style={{ alignItems:'flex-end' }}>
                <Text style={{ color:C.muted, fontSize:11 }}>Repetições</Text>
                <Text style={{ color:fase?.cor||C.accent, fontWeight:'900', fontSize:18 }}>{fase?.reps||'—'}</Text>
              </View>
            </View>
            <Text style={[styles.muted, { fontSize:11, marginTop:6 }]}>Intensidade sugerida: ~{fase?.pct||70}% do 1RM</Text>
          </View>
        );
      })()}

      {/* Workout info */}
      <View style={[styles.card, { backgroundColor:C.accent+'14', borderColor:C.accent, borderWidth:1, marginBottom:14 }]}>
        <View style={styles.row}>
          <View style={{ flex:1 }}>
            <Text style={[styles.workoutTitle, { color:C.accent }]}>{workout.name}</Text>
            <View style={[styles.row, { marginTop:4, gap:12 }]}>
              <View style={styles.row}><Ionicons name="trophy-outline" size={13} color={C.muted} style={{ marginRight:4 }} /><Text style={styles.muted}>{user.nivel}</Text></View>
              <View style={styles.row}><Ionicons name="time-outline" size={13} color={C.muted} style={{ marginRight:4 }} /><Text style={styles.muted}>{workout.time}</Text></View>
            </View>
          </View>
          <View style={styles.circularProgress}><Text style={styles.circularText}>{feitos}/{total}</Text></View>
        </View>
        <View style={[styles.progressBar, { marginTop:12 }]}>
          <View style={[styles.progressFill, { width:`${pct*100}%`, backgroundColor:C.accent }]} />
        </View>
      </View>

      {workout.tip && (
        <View style={[styles.card, { borderLeftWidth:3, borderLeftColor:C.blue, paddingLeft:14, marginBottom:8 }]}>
          <Text style={[styles.dicaTitle, { color:C.blue }]}>💡 Dica do Treino</Text>
          <Text style={styles.dicaText}>{workout.tip}</Text>
        </View>
      )}

      {/* Aviso de lesões ativas */}
      {(lesoes||[]).filter(l => l.ativo).length > 0 && (
        <View style={[styles.card, { borderLeftWidth:3, borderLeftColor:C.danger, paddingLeft:14, marginBottom:8, backgroundColor:C.danger+'10' }]}>
          <View style={[styles.row, { marginBottom:4 }]}>
            <Ionicons name="warning-outline" size={14} color={C.danger} style={{ marginRight:6 }} />
            <Text style={{ color:C.danger, fontWeight:'800', fontSize:12 }}>ATENÇÃO — LESÕES ATIVAS</Text>
          </View>
          <Text style={{ color:C.text, fontSize:12 }}>{(lesoes||[]).filter(l => l.ativo).map(l => l.musculo).join(', ')}</Text>
          <Text style={{ color:C.muted, fontSize:11, marginTop:2 }}>Evite ou adapte exercícios que envolvam essas áreas.</Text>
        </View>
      )}

      <View style={[styles.row, { justifyContent:'space-between', alignItems:'center', marginBottom:6, marginTop:2 }]}>
        <Text style={styles.sectionTitle}>Exercícios de Hoje</Text>
        <TouchableOpacity
          style={{ backgroundColor:C.accent+'22', borderRadius:10, paddingVertical:6, paddingHorizontal:12, borderWidth:1, borderColor:C.accent }}
          onPress={() => { setGuidedIdx(0); setGuidedMode(true); }}>
          <Text style={{ color:C.accent, fontWeight:'700', fontSize:12 }}>▶ Guiado</Text>
        </TouchableOpacity>
      </View>
      {workout.exercises.map((origEx, i) => {
        const ex = (exSubst||{})[i] || origEx;
        const isSubstituted = !!(exSubst||{})[i];
        const sets = exSets[i] || [];
        return (
          <View key={i} style={[styles.exCard, exChecked[i] && styles.exCardDone, isSubstituted && { borderColor:C.orange+'70' }]}>
            <TouchableOpacity style={[styles.exCheck, exChecked[i] && styles.exCheckDone]}
              onPress={() => { try { Vibration.vibrate(40); } catch(_) {} setExChecked(p => ({ ...p, [i]:!p[i] })); }}>
              {exChecked[i] && <Ionicons name="checkmark" size={14} color={C.bg} />}
            </TouchableOpacity>
            <View style={{ flex:1, marginLeft:12 }}>
              <View style={{ flexDirection:'row', alignItems:'center', flexWrap:'wrap' }}>
                <Text style={[styles.exName, exChecked[i] && { textDecorationLine:'line-through', color:C.muted }]}>{ex.n}</Text>
                {isSubstituted && <Text style={{ color:C.orange, fontSize:10, fontWeight:'700', marginLeft:6 }}>🔀 alt.</Text>}
              </View>
              <Text style={styles.exSeries}>{ex.s}</Text>
              {sets.length > 0 && (
                <View style={[styles.row, { flexWrap:'wrap', marginTop:4 }]}>
                  {sets.map((s,si) => (
                    <View key={s.id} style={styles.setChip}>
                      <Text style={styles.setChipText}>S{si+1}: {s.reps}rep{s.peso ? ` · ${s.peso}kg` : ''}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={[styles.row, { gap:6, flexWrap:'wrap', marginTop:2 }]}>
                <TouchableOpacity
                  style={[styles.exTimerChip, activeExTimer === i && { borderColor:C.accent, backgroundColor:C.accent+'22' }]}
                  onPress={() => setActiveExTimer(prev => prev === i ? null : i)}>
                  <Ionicons name="timer-outline" size={11} color={activeExTimer === i ? C.accent : C.muted} />
                  <Text style={[styles.exTimerText, activeExTimer === i && { color:C.accent }]}>
                    {activeExTimer === i ? formatTime(exTimerSec[i] || 0) : 'Timer'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flexDirection:'row', alignItems:'center', backgroundColor:'#FF000015', borderRadius:8, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:'#FF000055' }}
                  onPress={() => Linking.openURL('https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.n + ' como fazer'))}>
                  <Ionicons name="logo-youtube" size={11} color="#FF4444" />
                  <Text style={{ color:'#FF4444', fontSize:11, fontWeight:'700', marginLeft:4 }}>Vídeo</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.exBadge, { marginRight:4 }]}><Text style={styles.exBadgeText}>{i+1}</Text></View>
            <TouchableOpacity style={styles.addSetBtn} onPress={() => openSetModal(i)}>
              <Ionicons name="add" size={18} color={C.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.swapBtn, { borderColor: isSubstituted ? C.orange : C.border, backgroundColor: isSubstituted ? C.orange+'22' : 'transparent' }]}
              onPress={() => { setSwapIdx(i); setShowSwapModal(true); }}>
              <Ionicons name="shuffle" size={15} color={isSubstituted ? C.orange : C.muted} />
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.bigBtn, concluido && { backgroundColor:C.card2, borderColor:C.border, borderWidth:1 }]}
        onPress={() => { if (!concluido) { try { Vibration.vibrate([0,100,80,200]); } catch(_) {} setRpeVal(null); setShowRpeModal(true); } }}>
        <View style={styles.row}>
          <Ionicons name={concluido ? 'checkmark-circle' : 'flag'} size={18} color={concluido ? C.muted : C.bg} style={{ marginRight:8 }} />
          <Text style={[styles.bigBtnText, concluido && { color:C.muted }]}>{concluido ? 'Treino Concluído!' : 'Marcar como Concluído'}</Text>
        </View>
      </TouchableOpacity>

      {/* ── Compartilhamento pós-treino ── */}
      {concluido && (() => {
        const activeWorkout = treinoAtivo
          ? treinosCustom.find(t => t.id === treinoAtivo)
          : WORKOUTS[user.objetivo]?.[user.nivel];
        const totalSeries = Object.values(exSets).reduce((s, sets) => s + (sets||[]).length, 0);
        const maxCarga = Object.values(exSets).flatMap(s=>s).reduce((max,s)=>Math.max(max,parseFloat(s.peso)||0),0);
        return (
          <TouchableOpacity style={[styles.outlineBtn, { marginBottom:8, borderColor:C.accent }]}
            onPress={() => {
              const lines = [
                '🏋️ Treino Concluído!',
                `📋 ${activeWorkout?.name || 'Treino'} · ${new Date().toLocaleDateString('pt-BR')}`,
                `✅ ${Object.values(exChecked).filter(Boolean).length} exercícios · ${totalSeries} séries`,
                maxCarga > 0 ? `🏆 Maior carga: ${maxCarga}kg` : '',
                '',
                'NuTreino 💪 — Seu app de treino',
              ].filter(Boolean).join('\n');
              Share.share({ message: lines, title: 'Meu Treino' });
            }}>
            <View style={styles.row}>
              <Ionicons name="share-social-outline" size={16} color={C.accent} style={{ marginRight:6 }} />
              <Text style={[styles.outlineBtnText, { color:C.accent }]}>Compartilhar Treino</Text>
            </View>
          </TouchableOpacity>
        );
      })()}

      {/* Rest timer options after sets */}
      {!concluido && (
        <View style={[styles.card, { marginTop:8, padding:14 }]}>
          <Text style={[styles.muted, { marginBottom:10, textAlign:'center' }]}>⏱ Timer de Descanso</Text>
          <View style={[styles.row, { justifyContent:'space-around' }]}>
            {[30,60,90,120].map(s => (
              <TouchableOpacity key={s} style={{ backgroundColor:C.card2, borderRadius:10, paddingVertical:10, paddingHorizontal:14, borderWidth:1, borderColor:C.border }}
                onPress={() => startRest(s)}>
                <Text style={{ color:C.text, fontWeight:'700', fontSize:14 }}>{s}s</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      </>}

      </Animated.View>

      {/* Set logging modal */}
      <Modal visible={showSetModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight:'80%' }]}>
            <Text style={styles.modalTitle}>Registrar Série</Text>
            {curExIdx !== null && <Text style={[styles.muted, { marginTop:4, marginBottom:12 }]}>{(exSubst||{})[curExIdx]?.n || workout?.exercises[curExIdx]?.n}</Text>}
            {/* ── Comparação de sessões ── */}
            {(sessionsHistory||[]).length > 0 && curExIdx !== null && (() => {
              const recent = [...(sessionsHistory||[])].reverse().slice(0,3);
              const hasSets = recent.some(s => (s.exSets?.[curExIdx]||[]).length > 0);
              if (!hasSets) return null;
              return (
                <View style={{ width:'100%', marginBottom:10 }}>
                  {recent.map((session, si) => {
                    const sets = session.exSets?.[curExIdx] || [];
                    if (!sets.length) return null;
                    const maxP = Math.max(...sets.map(s => parseFloat(s.peso)||0));
                    const prevSets = recent[si+1]?.exSets?.[curExIdx] || [];
                    const prevMaxP = prevSets.length ? Math.max(...prevSets.map(s => parseFloat(s.peso)||0)) : null;
                    const delta = prevMaxP !== null && maxP > 0 && prevMaxP > 0 ? Math.round((maxP - prevMaxP)*10)/10 : null;
                    return (
                      <View key={si} style={{ marginBottom:4, padding:8, backgroundColor:si===0?C.accent+'18':C.card2, borderRadius:10, borderLeftWidth:3, borderLeftColor:si===0?C.accent:C.border }}>
                        <View style={[styles.row, { justifyContent:'space-between', marginBottom:2 }]}>
                          <Text style={[styles.muted, { fontSize:10 }]}>{si===0?'Última sessão':'Anterior'} · {session.date.split('-').reverse().join('/')}</Text>
                          {delta !== null && delta !== 0 && <Text style={{ color:delta>0?C.accent:C.danger, fontSize:11, fontWeight:'800' }}>{delta>0?'↑':'↓'}{Math.abs(delta)}kg</Text>}
                          {delta === 0 && <Text style={{ color:C.muted, fontSize:11 }}>↔</Text>}
                        </View>
                        <Text style={{ color:si===0?C.accent:C.muted, fontSize:12, fontWeight:'700' }}>
                          {sets.map((s,i)=>`S${i+1}: ${s.reps}rep${s.peso?` · ${s.peso}kg`:''}`).join('  ')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
            {(exSets[curExIdx] || []).length > 0 && (
              <View style={{ width:'100%', marginBottom:12 }}>
                <Text style={[styles.muted, { marginBottom:6 }]}>Séries hoje:</Text>
                {(exSets[curExIdx] || []).map((s,i) => (
                  <Text key={s.id} style={{ color:C.text, fontSize:13, marginBottom:2 }}>S{i+1}: {s.reps} rep{s.peso ? ` · ${s.peso}kg` : ''}</Text>
                ))}
              </View>
            )}
            {(() => {
              if (curExIdx === null) return null;
              const exName = (exSubst||{})[curExIdx]?.n || workout?.exercises[curExIdx]?.n;
              const pr = exName && prRecords?.[exName];
              if (!pr) return null;
              return (
                <View style={{ width:'100%', marginBottom:10, padding:10, backgroundColor:C.purple+'18', borderRadius:10, borderLeftWidth:3, borderLeftColor:C.purple, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                  <View>
                    <Text style={{ color:C.muted, fontSize:11, marginBottom:2 }}>🏆 PR atual: {pr.w}kg × {pr.reps}rep</Text>
                    <Text style={{ color:C.purple, fontWeight:'800', fontSize:13 }}>💡 Sugestão: {(pr.w + 2.5).toFixed(1)}kg</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSetPesoInput(String(pr.w + 2.5))}
                    style={{ backgroundColor:C.purple, borderRadius:8, paddingHorizontal:10, paddingVertical:6 }}>
                    <Text style={{ color:'#fff', fontSize:11, fontWeight:'700' }}>Usar</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
            {/* ── Aquecimento Automático ── */}
            {curExIdx === 0 && (() => {
              const exName = (exSubst||{})[curExIdx]?.n || workout?.exercises[curExIdx]?.n;
              const pr = exName && prRecords?.[exName];
              if (!pr || pr.w <= 0) return null;
              const warmups = [[0.4,12],[0.6,8],[0.8,4]].map(([pct,r])=>({ kg:Math.round(pr.w*pct*2)/2, reps:r }));
              return (
                <View style={{ width:'100%', marginBottom:12, padding:10, backgroundColor:C.orange+'14', borderRadius:10, borderLeftWidth:3, borderLeftColor:C.orange }}>
                  <Text style={{ color:C.orange, fontWeight:'800', fontSize:12, marginBottom:6 }}>🔥 Aquecimento Sugerido (1º exercício)</Text>
                  {warmups.map((w,i) => (
                    <View key={i} style={[styles.row, { justifyContent:'space-between', paddingVertical:3 }]}>
                      <Text style={{ color:C.muted, fontSize:12 }}>Série {i+1}: {w.kg}kg × {w.reps} rep</Text>
                      <TouchableOpacity onPress={() => setSetPesoInput(String(w.kg))} style={{ backgroundColor:C.orange+'33', borderRadius:6, paddingHorizontal:8, paddingVertical:2 }}>
                        <Text style={{ color:C.orange, fontSize:11, fontWeight:'700' }}>Usar</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })()}
            <Text style={[styles.setupLabel, { width:'100%' }]}>Repetições *</Text>
            <TextInput style={[styles.input, { width:'100%', marginBottom:12 }]} placeholder="Ex: 12" placeholderTextColor={C.muted}
              value={setRepsInput} onChangeText={setSetRepsInput} keyboardType="numeric" />
            <Text style={[styles.setupLabel, { width:'100%' }]}>Carga (kg) — opcional</Text>
            <TextInput style={[styles.input, { width:'100%' }]} placeholder="Ex: 60" placeholderTextColor={C.muted}
              value={setPesoInput} onChangeText={setSetPesoInput} keyboardType="decimal-pad" />
            <View style={[styles.row, { gap:10, marginTop:14, width:'100%' }]}>
              <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={saveSet}><Text style={styles.bigBtnText}>Registrar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setShowSetModal(false)}><Text style={styles.outlineBtnText}>Cancelar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── RPE Modal ── */}
      <Modal visible={showRpeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { alignItems:'center' }]}>
            <Text style={styles.modalTitle}>Como foi o treino?</Text>
            <Text style={[styles.muted, { marginTop:4, marginBottom:20, textAlign:'center' }]}>Avalie o esforço percebido (RPE)</Text>
            {[[1,'😴','Muito Leve'],[2,'🙂','Leve'],[3,'😐','Moderado'],[4,'💪','Forte'],[5,'🔥','Intenso'],[6,'😤','Muito Intenso'],[7,'🫠','Máximo'],[8,'💀','Extremo']].map(([v,e,l])=>(
              <TouchableOpacity key={v} onPress={() => setRpeVal(v)}
                style={[styles.row, { width:'100%', paddingVertical:10, paddingHorizontal:14, borderRadius:12, marginBottom:4,
                  backgroundColor: rpeVal===v ? C.accent+'22' : C.card2,
                  borderWidth:2, borderColor: rpeVal===v ? C.accent : 'transparent' }]}>
                <Text style={{ fontSize:20, marginRight:12 }}>{e}</Text>
                <Text style={{ flex:1, color:C.text, fontWeight:rpeVal===v?'800':'400', fontSize:14 }}>{l}</Text>
                <Text style={{ color:C.muted, fontWeight:'700' }}>{v}/8</Text>
              </TouchableOpacity>
            ))}
            <View style={[styles.row, { gap:10, marginTop:16, width:'100%' }]}>
              <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => { setShowRpeModal(false); onConcluir(null); setShowModal(true); }}>
                <Text style={styles.outlineBtnText}>Pular</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={() => { setShowRpeModal(false); onConcluir(rpeVal); setShowModal(true); setShowConfetti(true); setDomsRating({}); setTimeout(() => setShowDomsModal(true), 2000); }}>
                <Text style={styles.bigBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rest countdown modal */}
      <Modal visible={showRestModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor:'#000000CC' }]}>
          <View style={[styles.modalBox, { paddingVertical:40 }]}>
            <Text style={{ color:C.muted, fontSize:16, marginBottom:8 }}>Descansando...</Text>
            <Text style={{ color:restSec <= 10 ? C.danger : C.accent, fontSize:80, fontWeight:'900' }}>{restSec}</Text>
            <Text style={{ color:C.muted, fontSize:13, marginTop:4, marginBottom:24 }}>segundos restantes</Text>
            <TouchableOpacity style={[styles.outlineBtn, { marginTop:0, paddingHorizontal:32 }]} onPress={() => { clearInterval(restRef.current); setRestActive(false); setShowRestModal(false); }}>
              <Text style={styles.outlineBtnText}>Pular</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Lista de treinos customizados */}
      <Modal visible={showCustList} transparent animationType="slide">
        <View style={[styles.modalOverlay, { justifyContent:'flex-end', padding:0 }]}>
          <View style={{ backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, maxHeight:'80%' }}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:14 }]}>
              <Text style={{ color:C.text, fontSize:18, fontWeight:'800' }}>💪 Meus Treinos</Text>
              <TouchableOpacity onPress={() => setShowCustList(false)}><Ionicons name="close" size={22} color={C.muted} /></TouchableOpacity>
            </View>
            <ScrollView>
              {(treinosCustom||[]).length === 0 && <Text style={[styles.muted, {textAlign:'center', paddingVertical:20}]}>Nenhum treino criado ainda.</Text>}
              {(treinosCustom||[]).map(t => (
                <View key={t.id} style={styles.customCard}>
                  <View style={{ flex:1 }}>
                    <Text style={styles.customCardName}>{t.name}</Text>
                    <Text style={styles.customCardSub}>{t.exercises.length} exercícios · {t.time}</Text>
                  </View>
                  <TouchableOpacity style={styles.customIconBtn} onPress={() => { setShowCustList(false); openEditWorkout(t); }}><Ionicons name="create-outline" size={16} color={C.muted} /></TouchableOpacity>
                  <TouchableOpacity style={[styles.customIconBtn, {borderColor:C.danger+'50'}]} onPress={() => deleteCustomWorkout(t.id)}><Ionicons name="trash-outline" size={16} color={C.danger} /></TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.bigBtn, {marginTop:8}]} onPress={() => { setShowCustList(false); openNewWorkout(); }}>
              <View style={styles.row}><Ionicons name="add-circle-outline" size={18} color={C.bg} style={{marginRight:8}} /><Text style={styles.bigBtnText}>Criar Novo Treino</Text></View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Editor de treino customizado */}
      <Modal visible={showCustEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight:'90%' }]}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ width:'100%' }}>
              <Text style={styles.modalTitle}>{editingWk ? 'Editar Treino' : 'Novo Treino'}</Text>
              <Text style={[styles.setupLabel, {marginTop:14}]}>Nome do Treino</Text>
              <TextInput style={styles.input} placeholder="Ex: Peito e Tríceps" placeholderTextColor={C.muted} value={editWkName} onChangeText={setEditWkName} />
              <Text style={[styles.setupLabel, {marginTop:12}]}>Duração estimada (min)</Text>
              <TextInput style={[styles.input, {marginBottom:12}]} placeholder="45" placeholderTextColor={C.muted} value={editWkTime} onChangeText={setEditWkTime} keyboardType="numeric" />
              <Text style={[styles.setupLabel]}>Exercícios</Text>
              {editWkExs.map((ex, i) => (
                <View key={i} style={styles.customExRow}>
                  <TextInput style={[styles.input, {flex:2}]} placeholder="Nome do exercício" placeholderTextColor={C.muted} value={ex.n} onChangeText={v => setEditWkExs(prev => prev.map((e,ei) => ei===i?{...e,n:v}:e))} />
                  <TextInput style={[styles.input, {flex:1}]} placeholder="3x10" placeholderTextColor={C.muted} value={ex.s} onChangeText={v => setEditWkExs(prev => prev.map((e,ei) => ei===i?{...e,s:v}:e))} />
                  {editWkExs.length > 1 && <TouchableOpacity onPress={() => setEditWkExs(prev => prev.filter((_,ei) => ei!==i))}><Ionicons name="close-circle" size={22} color={C.danger} /></TouchableOpacity>}
                </View>
              ))}
              <TouchableOpacity style={styles.addExBtn} onPress={() => setEditWkExs(prev => [...prev, {n:'',s:''}])}>
                <Text style={{color:C.accent, fontWeight:'700'}}>+ Adicionar Exercício</Text>
              </TouchableOpacity>
              <View style={[styles.row, {gap:10, marginTop:14}]}>
                <TouchableOpacity style={[styles.bigBtn, {flex:1}]} onPress={saveCustomWorkout}><Text style={styles.bigBtnText}>Salvar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.outlineBtn, {flex:1}]} onPress={() => setShowCustEdit(false)}><Text style={styles.outlineBtnText}>Cancelar</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CompletionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        userName={user.nome}
        timerSec={timerSec}
        feitos={feitos}
        total={total}
        onSaveNota={onSaveNota}
      />

      {/* Confetti */}
      <ConfettiView visible={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* DOMS Modal */}
      <Modal visible={showDomsModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { justifyContent:'flex-end', padding:0 }]}>
          <View style={{ backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, maxHeight:'80%' }}>
            <Text style={{ color:C.text, fontSize:18, fontWeight:'800', marginBottom:4 }}>😣 Como estão seus músculos?</Text>
            <Text style={{ color:C.muted, fontSize:12, marginBottom:16 }}>Registre dor muscular (DOMS) de hoje para personalizar sua recuperação.</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {DOMS_MUSCLES.map(m => (
                <View key={m} style={{ marginBottom:12 }}>
                  <Text style={{ color:C.text, fontWeight:'600', marginBottom:6 }}>{m}</Text>
                  <View style={{ flexDirection:'row', gap:6 }}>
                    {[1,2,3,4,5].map(n => (
                      <TouchableOpacity key={n} onPress={() => setDomsRating(p => ({...p,[m]:n}))}
                        style={{ flex:1, padding:8, borderRadius:8, alignItems:'center',
                          backgroundColor: domsRating[m]===n ? C.accent+'30' : C.card2,
                          borderWidth:1.5, borderColor: domsRating[m]===n ? C.accent : C.border }}>
                        <Text style={{ fontSize:16 }}>{DOMS_EMOJI[n]}</Text>
                        <Text style={{ color:C.muted, fontSize:10 }}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={[styles.row, { gap:10, marginTop:12 }]}>
              <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setShowDomsModal(false)}>
                <Text style={styles.outlineBtnText}>Pular</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={() => {
                if (Object.keys(domsRating).length > 0) {
                  setDomsLog(prev => [...(prev||[]).slice(-29), { date: todayKey(), musculos: domsRating }]);
                }
                setShowDomsModal(false);
              }}>
                <Text style={styles.bigBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gerador de Treino Modal */}
      <Modal visible={showGerador} transparent animationType="slide">
        <View style={[styles.modalOverlay, { justifyContent:'flex-end', padding:0 }]}>
          <View style={{ backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, maxHeight:'90%' }}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:12 }]}>
              <Text style={{ color:C.text, fontSize:18, fontWeight:'800' }}>⚡ Gerador de Treino</Text>
              <TouchableOpacity onPress={() => { setShowGerador(false); setGenResult(null); }}><Ionicons name="close" size={22} color={C.muted} /></TouchableOpacity>
            </View>
            {!genResult ? (
              <ScrollView>
                <Text style={{ color:C.muted, fontSize:12, marginBottom:4 }}>Equipamento disponível:</Text>
                {GEN_EQUIPAMENTOS.map(e => (
                  <TouchableOpacity key={e} onPress={() => setGenEquip(e)}
                    style={[{ padding:10, borderRadius:8, marginBottom:6, borderWidth:1.5,
                      borderColor:genEquip===e?C.accent:C.border, backgroundColor:genEquip===e?C.accent+'15':C.card2 }]}>
                    <Text style={{ color:genEquip===e?C.accent:C.text }}>{e}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={{ color:C.muted, fontSize:12, marginTop:12, marginBottom:4 }}>Grupo muscular:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
                  {GEN_GRUPOS.map(g => (
                    <TouchableOpacity key={g} onPress={() => setGenGrupo(g)}
                      style={[{ paddingHorizontal:14, paddingVertical:8, borderRadius:20, marginRight:8, borderWidth:1.5,
                        borderColor:genGrupo===g?C.accent:C.border, backgroundColor:genGrupo===g?C.accent+'15':C.card2 }]}>
                      <Text style={{ color:genGrupo===g?C.accent:C.text, fontSize:13 }}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={{ color:C.muted, fontSize:12, marginBottom:4 }}>Tempo disponível:</Text>
                <View style={{ flexDirection:'row', gap:8, marginBottom:16 }}>
                  {GEN_TEMPO.map(t => (
                    <TouchableOpacity key={t} onPress={() => setGenTempo(t)}
                      style={[{ flex:1, padding:10, borderRadius:8, alignItems:'center', borderWidth:1.5,
                        borderColor:genTempo===t?C.accent:C.border, backgroundColor:genTempo===t?C.accent+'15':C.card2 }]}>
                      <Text style={{ color:genTempo===t?C.accent:C.text, fontWeight:'700' }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.bigBtn} onPress={() => {
                  const exMap = {
                    'Peito':['Flexão','Supino','Crossover','Peck Deck'],
                    'Costas':['Remada','Pull-Up','Puxada no Pulley','Remada Unilateral'],
                    'Ombros':['Desenvolvimento','Elevação Lateral','Elevação Frontal','Arnold Press'],
                    'Bíceps':['Rosca Direta','Rosca Alternada','Rosca Concentrada','Rosca Martelo'],
                    'Tríceps':['Tríceps Corda','Tríceps Francês','Mergulho','Extensão'],
                    'Pernas':['Agachamento','Leg Press','Extensão de Pernas','Flexão de Pernas'],
                    'Glúteos':['Agachamento Sumô','Hip Thrust','Afundo','Elevação Pélvica'],
                    'Core':['Prancha','Abdominal Crunch','Russian Twist','Mountain Climber'],
                    'Full-body':['Burpee','Agachamento','Flexão','Remada','Prancha','Kettlebell Swing'],
                  };
                  const exs = exMap[genGrupo] || exMap['Full-body'];
                  const nSets = genTempo === '20 min' ? 2 : genTempo === '30 min' ? 3 : 4;
                  const nReps = genEquip === 'Sem equipamento' ? '15-20' : '10-12';
                  setGenResult({
                    nome:`${genGrupo} — ${genEquip}`,
                    tempo:genTempo,
                    exercises: exs.map(e => ({ n:e, s:`${nSets}×${nReps}` })),
                  });
                }}>
                  <Text style={styles.bigBtnText}>Gerar Treino</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView>
                <Text style={{ color:C.accent, fontWeight:'800', fontSize:16, marginBottom:4 }}>{genResult.nome}</Text>
                <Text style={{ color:C.muted, fontSize:12, marginBottom:12 }}>{genResult.tempo} · {genResult.exercises.length} exercícios</Text>
                {genResult.exercises.map((e,i) => (
                  <View key={i} style={[styles.card, { marginBottom:6, padding:10, flexDirection:'row', justifyContent:'space-between' }]}>
                    <Text style={{ color:C.text, fontWeight:'600' }}>{e.n}</Text>
                    <Text style={{ color:C.muted }}>{e.s}</Text>
                  </View>
                ))}
                <View style={[styles.row, { gap:10, marginTop:12 }]}>
                  <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setGenResult(null)}>
                    <Text style={styles.outlineBtnText}>Regenerar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={() => {
                    const novoTreino = { id:'gen_'+Date.now(), name:genResult.nome, time:genResult.tempo, exercises:genResult.exercises };
                    setTreinosCustom(prev => [...(prev||[]), novoTreino]);
                    setTreinoAtivo(novoTreino.id);
                    setShowGerador(false); setGenResult(null);
                    Alert.alert('✅ Treino salvo!', 'Treino gerado salvo e ativado.');
                  }}>
                    <Text style={styles.bigBtnText}>Usar Este Treino</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Guided workout modal */}
      <Modal visible={guidedMode && !isCardio && !!workout} transparent animationType="slide">
        <View style={styles.guidedOverlay}>
          <View style={styles.guidedCard}>
            {workout && (() => {
              const gEx = (exSubst||{})[guidedIdx] || workout.exercises[guidedIdx];
              const gSets = exSets[guidedIdx] || [];
              const isLast = guidedIdx >= workout.exercises.length - 1;
              return (
                <>
                  {/* Progress dots */}
                  <View style={[styles.row, { gap:4, marginBottom:16 }]}>
                    {workout.exercises.map((_,di) => (
                      <View key={di} style={[styles.guidedProgDot, di === guidedIdx && styles.guidedProgDotOn]} />
                    ))}
                  </View>

                  <Text style={[styles.muted, { fontSize:12, marginBottom:4 }]}>
                    Exercício {guidedIdx + 1} de {workout.exercises.length}
                  </Text>
                  <Text style={{ color:C.text, fontSize:22, fontWeight:'900', marginBottom:4 }}>{gEx?.n}</Text>
                  <Text style={[styles.muted, { fontSize:14, marginBottom:10 }]}>{gEx?.s}</Text>

                  <TouchableOpacity
                    style={{ flexDirection:'row', alignItems:'center', alignSelf:'flex-start', backgroundColor:'#FF000015', borderRadius:10, paddingHorizontal:12, paddingVertical:7, borderWidth:1, borderColor:'#FF000055', marginBottom:12 }}
                    onPress={() => Linking.openURL('https://www.youtube.com/results?search_query=' + encodeURIComponent((gEx?.n || '') + ' como fazer'))}>
                    <Ionicons name="logo-youtube" size={15} color="#FF4444" />
                    <Text style={{ color:'#FF4444', fontSize:13, fontWeight:'700', marginLeft:6 }}>Ver como fazer</Text>
                  </TouchableOpacity>

                  {/* Sets logged */}
                  {gSets.length > 0 && (
                    <View style={[styles.row, { flexWrap:'wrap', marginBottom:8, gap:6 }]}>
                      {gSets.map((s,si) => (
                        <View key={s.id} style={styles.setChip}>
                          <Text style={styles.setChipText}>S{si+1}: {s.reps}rep{s.peso ? ` · ${s.peso}kg` : ''}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.outlineBtn, { marginBottom:14 }]}
                    onPress={() => { openSetModal(guidedIdx); }}>
                    <Text style={styles.outlineBtnText}>+ Registrar Série</Text>
                  </TouchableOpacity>

                  <View style={[styles.row, { gap:6, flexWrap:'wrap', marginBottom:14 }]}>
                    <Text style={{ color:C.muted, fontSize:11, width:'100%', marginBottom:2 }}>Descanso rápido:</Text>
                    {[30, 60, 90, 120].map(sec => (
                      <TouchableOpacity key={sec}
                        style={{ backgroundColor:C.card2, borderRadius:10, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:C.border }}
                        onPress={() => startRest(sec)}>
                        <Text style={{ color:C.text, fontSize:12, fontWeight:'700' }}>{sec < 60 ? `${sec}s` : `${sec/60}min`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={[styles.row, { gap:10 }]}>
                    <TouchableOpacity
                      style={[styles.outlineBtn, { flex:1 }, guidedIdx === 0 && { opacity:0.4 }]}
                      disabled={guidedIdx === 0}
                      onPress={() => setGuidedIdx(i => Math.max(i-1, 0))}>
                      <Text style={styles.outlineBtnText}>← Anterior</Text>
                    </TouchableOpacity>
                    {isLast ? (
                      <TouchableOpacity
                        style={[styles.bigBtn, { flex:1 }]}
                        onPress={() => { setGuidedMode(false); if (!concluido) { try { Vibration.vibrate([0,100,80,200]); } catch(_) {} setRpeVal(null); setShowRpeModal(true); } }}>
                        <Text style={styles.bigBtnText}>Concluir Treino</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.bigBtn, { flex:1 }]}
                        onPress={() => setGuidedIdx(i => Math.min(i+1, workout.exercises.length-1))}>
                        <Text style={styles.bigBtnText}>Próximo →</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity style={{ marginTop:14, alignItems:'center' }} onPress={() => setGuidedMode(false)}>
                    <Text style={[styles.muted, { fontSize:12 }]}>✕ Fechar modo guiado</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Planner modal */}
      <Modal visible={showPlannerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight:'88%', alignItems:'stretch' }]}>
            {(() => {
              const DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
              const treinoOpts = [
                { id: null,         label: '— Livre / Sem plano' },
                { id: 'descanso',   label: '🛌 Descanso' },
                { id: 'padrao',     label: `💪 Padrão (${user.objetivo})` },
                { id: '__cardio__', label: '🏃 Cardio' },
                ...(treinosCustom||[]).map(t => ({ id: t.id, label: `✏️ ${t.name}` })),
              ];
              return (
                <>
                  <View style={[styles.row, { justifyContent:'space-between', marginBottom:4 }]}>
                    <Text style={styles.modalTitle}>{plannerDayIdx !== null ? DIAS[plannerDayIdx] : ''}</Text>
                    <TouchableOpacity onPress={() => setShowPlannerModal(false)}>
                      <Ionicons name="close" size={22} color={C.muted} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ width:'100%' }} keyboardShouldPersistTaps="handled">
                    {/* Tipo de treino */}
                    <Text style={[styles.setupLabel, { marginBottom:8, marginTop:4 }]}>Tipo de Treino</Text>
                    {treinoOpts.map(opt => (
                      <TouchableOpacity key={String(opt.id)} onPress={() => setPlannerSelTreino(opt.id)}
                        style={[styles.card, { marginBottom:6, flexDirection:'row', alignItems:'center', paddingVertical:10,
                          borderColor: plannerSelTreino===opt.id ? C.accent : C.border,
                          backgroundColor: plannerSelTreino===opt.id ? C.accent+'12' : C.card }]}>
                        <Text style={{ color: plannerSelTreino===opt.id ? C.accent : C.text, flex:1, fontWeight: plannerSelTreino===opt.id ? '800' : '400', fontSize:13 }}>{opt.label}</Text>
                        {plannerSelTreino===opt.id && <Ionicons name="checkmark-circle" size={17} color={C.accent} />}
                      </TouchableOpacity>
                    ))}

                    {/* Grupo muscular */}
                    <Text style={[styles.setupLabel, { marginTop:12, marginBottom:8 }]}>Grupo Muscular</Text>
                    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                      {[{ id:null, label:'Nenhum', abbr:'—', cor:C.muted }, ...GRUPOS_MUSCULARES].map(g => {
                        const sel = plannerSelGrupo === g.id;
                        return (
                          <TouchableOpacity key={String(g.id)} onPress={() => setPlannerSelGrupo(g.id)}
                            style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:12, borderWidth:1.5,
                              borderColor: sel ? g.cor : C.border,
                              backgroundColor: sel ? g.cor + '22' : C.card2 }}>
                            <Text style={{ color: sel ? g.cor : C.muted, fontWeight: sel ? '800' : '400', fontSize:12 }}>
                              {g.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity style={styles.bigBtn} onPress={() => {
                      setPlannerSemana(prev => ({
                        ...prev,
                        [plannerDayIdx]: { treino: plannerSelTreino, grupo: plannerSelGrupo },
                      }));
                      setShowPlannerModal(false);
                    }}>
                      <Text style={styles.bigBtnText}>Salvar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.outlineBtn, { marginTop:8 }]} onPress={() => setShowPlannerModal(false)}>
                      <Text style={styles.outlineBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Swap exercise modal */}
      <Modal visible={showSwapModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { justifyContent:'flex-end', padding:0 }]}>
          <View style={{ backgroundColor:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, maxHeight:'75%' }}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:12 }]}>
              <Text style={{ color:C.text, fontSize:17, fontWeight:'800' }}>🔀 Trocar Exercício</Text>
              <TouchableOpacity onPress={() => setShowSwapModal(false)}>
                <Ionicons name="close" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            {swapIdx !== null && (
              <>
                <Text style={[styles.muted, { marginBottom:14, fontSize:12 }]}>
                  Original: <Text style={{ color:C.text, fontWeight:'600' }}>{workout.exercises[swapIdx]?.n}</Text>
                </Text>
                <Text style={[styles.sectionTitle2, { marginBottom:10 }]}>Alternativas:</Text>
                <ScrollView>
                  {(EXERCISE_ALTS[workout.exercises[swapIdx]?.n] || [
                    {n:'Variação A — '+workout.exercises[swapIdx]?.n, s:workout.exercises[swapIdx]?.s},
                    {n:'Exercício equivalente', s:workout.exercises[swapIdx]?.s},
                  ]).map((alt, ai) => (
                    <TouchableOpacity key={ai} style={[styles.swapAltCard, (exSubst||{})[swapIdx]?.n===alt.n && { borderColor:C.orange, backgroundColor:C.orange+'12' }]}
                      onPress={() => { setExSubst(prev => ({...prev, [swapIdx]:alt})); setShowSwapModal(false); }}>
                      <Text style={styles.swapAltName}>{alt.n}</Text>
                      <Text style={styles.swapAltSeries}>{alt.s}</Text>
                    </TouchableOpacity>
                  ))}
                  {(exSubst||{})[swapIdx] && (
                    <TouchableOpacity style={[styles.outlineBtn, { borderColor:C.danger, marginTop:4 }]}
                      onPress={() => { setExSubst(prev => { const p = {...prev}; delete p[swapIdx]; return p; }); setShowSwapModal(false); }}>
                      <Text style={[styles.outlineBtnText, { color:C.danger }]}>Restaurar exercício original</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── DIETA ────────────────────────────────────────────────────────────────────
function DietaScreen({ user, checkedMeals, setCheckedMeals, extraKcal, setExtraKcal, customFoods, setCustomFoods, customFoodLog, setCustomFoodLog, treinosLog, macroCiclo, setMacroCiclo }) {
  const { C, styles } = useTheme();
  const screenAnim = useScreenAnimation();
  const plan = MEALS[user.objetivo];
  const [dietaTab, setDietaTab] = useState('plano');

  // Plano tab state
  const [showAdd, setShowAdd] = useState(false);
  const [addKcal, setAddKcal] = useState('');

  // Alimentos tab state
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [showCreateFood, setShowCreateFood] = useState(false);
  const [pickerFood, setPickerFood]         = useState(null);
  const [pickerGrams, setPickerGrams]       = useState('');
  const [foodSearch, setFoodSearch]         = useState('');
  const [foodCategory, setFoodCategory]     = useState('Todos');
  const [newFoodName, setNewFoodName]       = useState('');
  const [newFoodKcal, setNewFoodKcal]       = useState('');
  const [newFoodProt, setNewFoodProt]       = useState('');
  const [newFoodCarb, setNewFoodCarb]       = useState('');
  const [newFoodFat,  setNewFoodFat]        = useState('');

  const kcalIngeridas = Object.entries(checkedMeals).filter(([,v]) => v).reduce((acc,[k]) => acc + (plan.refeicoes[parseInt(k,10)]?.kcal || 0), 0) + extraKcal;
  const pct = Math.min(kcalIngeridas / plan.calorias, 1);

  const todayStr = new Date().toDateString();
  const todayLog = (customFoodLog || []).filter(e => new Date(e.date).toDateString() === todayStr);
  const logKcal  = todayLog.reduce((s, e) => s + e.kcal, 0);
  const logProt  = todayLog.reduce((s, e) => s + e.prot, 0);
  const logCarb  = todayLog.reduce((s, e) => s + e.carb, 0);
  const logFat   = todayLog.reduce((s, e) => s + e.fat,  0);
  const totalKcal = kcalIngeridas + logKcal;

  const macroTargets = calcMacros(plan.calorias, user.objetivo);

  const pickerCalc = pickerFood && pickerGrams
    ? calcFoodEntry(pickerFood, parseFloat(pickerGrams) || 0)
    : null;

  const filteredFoods = (customFoods || DEFAULT_FOODS).filter(f =>
    (foodCategory === 'Todos' || f.cat === foodCategory) &&
    normalizeStr(f.name).includes(normalizeStr(foodSearch))
  );

  function confirmPickerFood() {
    if (!pickerFood || !pickerGrams) return;
    const entry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      foodName: pickerFood.name,
      grams: parseFloat(pickerGrams),
      ...calcFoodEntry(pickerFood, parseFloat(pickerGrams)),
    };
    setCustomFoodLog(prev => [...(prev||[]), entry]);
    setPickerFood(null); setPickerGrams(''); setShowFoodPicker(false);
  }

  function createCustomFood() {
    const kcalV = parseFloat(newFoodKcal); const protV = parseFloat(newFoodProt);
    const carbV = parseFloat(newFoodCarb); const fatV  = parseFloat(newFoodFat);
    if (!newFoodName.trim() || isNaN(kcalV) || isNaN(protV) || isNaN(carbV) || isNaN(fatV)) {
      Alert.alert('Erro', 'Preencha todos os campos corretamente.'); return;
    }
    const food = { id:'cf'+Date.now(), name:newFoodName.trim(), kcalPer100:kcalV, protPer100:protV, carbPer100:carbV, fatPer100:fatV, cat:'Personalizado' };
    setCustomFoods(prev => { const uc=(prev||[]).filter(f=>f.cat==='Personalizado'); return [...DEFAULT_FOODS,...uc,food]; });
    setNewFoodName(''); setNewFoodKcal(''); setNewFoodProt(''); setNewFoodCarb(''); setNewFoodFat('');
    setShowCreateFood(false);
    Alert.alert('Criado!', `"${food.name}" adicionado à biblioteca.`);
  }

  const [receitaCat, setReceitaCat] = useState('Todos');
  const [receitaSel, setReceitaSel] = useState(null);
  const DIETA_TABS = [{ id:'plano', label:'Plano' }, { id:'alimentos', label:'Alimentos' }, { id:'receitas', label:'Receitas' }, { id:'historico', label:'Histórico' }];

  const histDias = useMemo(() => {
    const map = {};
    (customFoodLog||[]).forEach(e => {
      const dk = new Date(e.date).toDateString();
      if (!map[dk]) map[dk] = { dateStr: dk, date: new Date(e.date), items:[], kcal:0, prot:0, carb:0, fat:0 };
      map[dk].items.push(e);
      map[dk].kcal += e.kcal; map[dk].prot += e.prot; map[dk].carb += e.carb; map[dk].fat += e.fat;
    });
    return Object.values(map).sort((a,b) => b.date - a.date).slice(0, 14);
  }, [customFoodLog]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom:24 }}>
      <Animated.View style={screenAnim}>
      {/* Tab selector */}
      <View style={[styles.row, { backgroundColor:C.card2, borderRadius:14, padding:4, marginBottom:14, borderWidth:1, borderColor:C.border }]}>
        {DIETA_TABS.map(t => (
          <TouchableOpacity key={t.id} style={[{ flex:1, paddingVertical:8, borderRadius:11, alignItems:'center' },
            dietaTab===t.id && { backgroundColor:C.card }]}
            onPress={() => setDietaTab(t.id)}>
            <Text style={{ color: dietaTab===t.id ? C.accent : C.muted, fontWeight: dietaTab===t.id ? '700' : '400', fontSize:13 }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {dietaTab === 'plano' && (
        <>
          <View style={[styles.card, { borderColor:C.orange, borderWidth:1 }]}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:6 }]}>
              <View style={styles.row}><Ionicons name="flame" size={18} color={C.orange} style={{ marginRight:6 }} /><Text style={styles.sectionTitle2}>Meta Calórica</Text></View>
              <Text style={[styles.kcalVal, { color:C.orange }]}>{totalKcal} / {plan.calorias} kcal</Text>
            </View>
            {plan.macro && <Text style={[styles.muted, { fontSize:11, marginBottom:8 }]}>📊 {plan.macro}</Text>}
            <View style={styles.progressBar}><View style={[styles.progressFill, { width:`${Math.min(totalKcal/plan.calorias,1)*100}%`, backgroundColor:C.orange }]} /></View>
            <Text style={[styles.muted, { marginTop:8, textAlign:'center' }]}>{plan.calorias - totalKcal > 0 ? `Faltam ${plan.calorias - totalKcal} kcal para a meta` : '✅ Meta atingida!'}</Text>
          </View>

          <Text style={styles.sectionTitle}>Plano Alimentar</Text>
          {plan.refeicoes.map((r,i) => (
            <TouchableOpacity key={i} style={[styles.mealCard, checkedMeals[i] && styles.mealCardDone]} onPress={() => setCheckedMeals(p => ({ ...p, [i]:!p[i] }))}>
              <View style={{ flex:1, paddingRight:8 }}>
                <Text style={styles.mealName}>{r.nome}</Text>
                <Text style={styles.mealItems}>{r.itens}</Text>
                {r.detalhes && <Text style={[styles.muted, { fontSize:11, marginTop:4, fontStyle:'italic' }]}>💡 {r.detalhes}</Text>}
              </View>
              <View style={{ alignItems:'flex-end', gap:6 }}>
                <Text style={[styles.mealKcal, { color:checkedMeals[i] ? C.accent : C.orange }]}>{r.kcal} kcal</Text>
                <View style={[styles.exCheck, checkedMeals[i] && styles.exCheckDone]}>{checkedMeals[i] && <Ionicons name="checkmark" size={14} color={C.bg} />}</View>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.outlineBtn, { marginTop:8 }]} onPress={() => setShowAdd(true)}>
            <View style={styles.row}><Ionicons name="add-circle-outline" size={18} color={C.muted} style={{ marginRight:8 }} /><Text style={styles.outlineBtnText}>Adicionar Calorias Extras</Text></View>
          </TouchableOpacity>
        </>
      )}

      {dietaTab === 'alimentos' && (
        <>
          {/* Macro targets */}
          {(() => {
            const todayStr2 = todayKey();
            const treinouHoje = (treinosLog||[]).includes(todayStr2);
            let targets = macroTargets;
            if (macroCiclo) {
              const kcalBase = plan.calorias;
              const kcalAdj  = treinouHoje ? kcalBase + 200 : kcalBase - 200;
              targets = calcMacros(kcalAdj, user.objetivo);
            }
            return (
              <View style={styles.card}>
                <View style={[styles.row, { justifyContent:'space-between', marginBottom:10 }]}>
                  <Text style={styles.sectionTitle2}>Macronutrientes de Hoje</Text>
                  <TouchableOpacity onPress={() => setMacroCiclo(v => !v)}
                    style={{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:macroCiclo?C.accent+'22':C.card2, borderRadius:10, paddingHorizontal:8, paddingVertical:4, borderWidth:1, borderColor:macroCiclo?C.accent:C.border }}>
                    <Text style={{ fontSize:12 }}>🔄</Text>
                    <Text style={{ color:macroCiclo?C.accent:C.muted, fontSize:11, fontWeight:'700' }}>Ciclagem</Text>
                  </TouchableOpacity>
                </View>
                {macroCiclo && (
                  <View style={{ backgroundColor:treinouHoje?C.accent+'12':C.orange+'12', borderRadius:10, padding:8, marginBottom:10 }}>
                    <Text style={{ color:treinouHoje?C.accent:C.orange, fontSize:12, fontWeight:'700', textAlign:'center' }}>
                      {treinouHoje ? '💪 Dia de treino — +200 kcal + mais carbos' : '😴 Dia de descanso — -200 kcal + mais gordura'}
                    </Text>
                  </View>
                )}
                {[
                  { label:'Proteína',    val:Math.round(logProt), total:targets.protG, color:C.accent },
                  { label:'Carboidrato', val:Math.round(logCarb), total:targets.carbG, color:C.orange },
                  { label:'Gordura',     val:Math.round(logFat),  total:targets.fatG,  color:C.purple },
                ].map(m => (
                  <View key={m.label} style={styles.macroRow}>
                    <Text style={styles.macroBarLabel}>{m.label}</Text>
                    <View style={styles.macroBarBg}>
                      <View style={[styles.macroBarFill, { width:`${Math.min(m.total>0?m.val/m.total:0,1)*100}%`, backgroundColor:m.color }]} />
                    </View>
                    <Text style={styles.macroValText}>{m.val}/{m.total}g</Text>
                  </View>
                ))}
                <Text style={[styles.muted, { textAlign:'center', marginTop:4, fontSize:11 }]}>
                  Total hoje: {logKcal} kcal de alimentos registrados
                </Text>
              </View>
            );
          })()}

          {/* Micronutrientes estimados */}
          {todayLog.length > 0 && (() => {
            const micros = { vitD:0, ferro:0, calcio:0, fibra:0, zinco:0, vitC:0, potassio:0 };
            todayLog.forEach(e => {
              const food = (customFoods||[]).find(f => f.name === e.foodName);
              const cat  = food?.cat || 'Personalizado';
              const base = CATEGORY_MICROS_PER_100[cat] || CATEGORY_MICROS_PER_100['Personalizado'];
              Object.keys(micros).forEach(k => { micros[k] += (base[k]||0) * (e.grams||0) / 100; });
            });
            return (
              <View style={[styles.card, { marginBottom:14 }]}>
                <Text style={[styles.sectionTitle2, { marginBottom:10 }]}>🔬 Micronutrientes Estimados</Text>
                {MICROS_LABELS.map(m => {
                  const val = Math.round(micros[m.key] * 10) / 10;
                  const dri = MICROS_DRI[m.key];
                  const pct = Math.min(val / dri, 1);
                  const clr = pct >= 1 ? C.accent : pct >= 0.5 ? C.orange : C.danger;
                  return (
                    <View key={m.key} style={{ marginBottom:8 }}>
                      <View style={[styles.row, { justifyContent:'space-between', marginBottom:3 }]}>
                        <Text style={{ color:C.text, fontSize:12 }}>{m.emoji} {m.label}</Text>
                        <Text style={{ color:clr, fontSize:11, fontWeight:'700' }}>{val}{m.unit} / {dri}{m.unit} ({Math.round(pct*100)}%)</Text>
                      </View>
                      <View style={[styles.progressBar, { height:5, borderRadius:3 }]}>
                        <View style={[styles.progressFill, { width:`${pct*100}%`, height:5, borderRadius:3, backgroundColor:clr }]} />
                      </View>
                    </View>
                  );
                })}
                <Text style={[styles.muted, { fontSize:10, marginTop:4, textAlign:'center' }]}>*Valores estimados com base na categoria dos alimentos</Text>
              </View>
            );
          })()}

          {/* Today's log */}
          <View style={[styles.row, { justifyContent:'space-between', alignItems:'center', marginBottom:6 }]}>
            <Text style={styles.sectionTitle}>Registros de Hoje</Text>
          </View>
          {todayLog.length === 0 && (
            <Text style={[styles.muted, { textAlign:'center', marginBottom:12 }]}>Nenhum alimento registrado hoje.</Text>
          )}
          {todayLog.map(e => (
            <View key={e.id} style={styles.foodLogCard}>
              <View style={{ flex:1 }}>
                <Text style={styles.foodLogName}>{e.foodName}</Text>
                <Text style={styles.foodLogMacros}>{e.grams}g · {e.kcal} kcal · P:{e.prot}g C:{e.carb}g G:{e.fat}g</Text>
              </View>
              <TouchableOpacity onPress={() => setCustomFoodLog(prev => prev.filter(x => x.id !== e.id))}>
                <Ionicons name="trash-outline" size={18} color={C.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={[styles.bigBtn, { marginBottom:8 }]} onPress={() => setShowFoodPicker(true)}>
            <Text style={styles.bigBtnText}>+ Registrar Alimento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowCreateFood(true)}>
            <Text style={styles.outlineBtnText}>+ Criar Alimento Personalizado</Text>
          </TouchableOpacity>
        </>
      )}

      {dietaTab === 'receitas' && (() => {
        const cats = ['Todos', ...new Set(RECEITAS_FITNESS.map(r => r.cat))];
        const filtradas = receitaCat === 'Todos' ? RECEITAS_FITNESS : RECEITAS_FITNESS.filter(r => r.cat === receitaCat);
        return (
          <>
            <Text style={styles.sectionTitle}>🍳 Receitas Fitness</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }} contentContainerStyle={{ paddingHorizontal:2, gap:8 }}>
              {cats.map(c => (
                <TouchableOpacity key={c} onPress={() => setReceitaCat(c)}
                  style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:20, marginRight:8, borderWidth:1.5,
                    backgroundColor:receitaCat===c?C.accent+'20':C.card2, borderColor:receitaCat===c?C.accent:C.border }}>
                  <Text style={{ color:receitaCat===c?C.accent:C.muted, fontSize:12, fontWeight:'600' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {filtradas.map(r => (
              <TouchableOpacity key={r.id} onPress={() => setReceitaSel(receitaSel?.id===r.id ? null : r)}
                style={[styles.card, { marginBottom:10 }]}>
                <View style={[styles.row, { justifyContent:'space-between', marginBottom:4 }]}>
                  <Text style={{ color:C.text, fontWeight:'800', flex:1 }}>{r.nome}</Text>
                  <Text style={{ color:C.muted, fontSize:11 }}>{r.tempo}</Text>
                  <Ionicons name={receitaSel?.id===r.id ? 'chevron-up' : 'chevron-down'} size={16} color={C.muted} style={{ marginLeft:6 }} />
                </View>
                <View style={[styles.row, { gap:10, marginBottom:receitaSel?.id===r.id ? 12 : 0 }]}>
                  <Text style={{ color:C.orange, fontSize:12, fontWeight:'700' }}>{r.kcal} kcal</Text>
                  <Text style={{ color:C.accent, fontSize:12 }}>P: {r.prot}g</Text>
                  <Text style={{ color:C.orange, fontSize:12 }}>C: {r.carb}g</Text>
                  <Text style={{ color:C.purple, fontSize:12 }}>G: {r.fat}g</Text>
                </View>
                {receitaSel?.id === r.id && (
                  <View>
                    <Text style={{ color:C.muted, fontSize:11, marginBottom:6, fontWeight:'700' }}>INGREDIENTES</Text>
                    {r.ingredientes.map((ing, i) => (
                      <Text key={i} style={{ color:C.text, fontSize:12, marginBottom:2 }}>• {ing}</Text>
                    ))}
                    <Text style={{ color:C.muted, fontSize:11, marginTop:8, marginBottom:4, fontWeight:'700' }}>PREPARO</Text>
                    <Text style={{ color:C.text, fontSize:12, lineHeight:18 }}>{r.preparo}</Text>
                    <View style={{ backgroundColor:C.accent+'15', borderRadius:8, padding:10, marginTop:10 }}>
                      <Text style={{ color:C.accent, fontSize:11, textAlign:'center' }}>{r.cat} · {r.tempo}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        );
      })()}

      {dietaTab === 'historico' && (
        <>
          <Text style={styles.sectionTitle}>📋 Histórico de Alimentos</Text>
          {histDias.length === 0 ? (
            <View style={[styles.card, { alignItems:'center', paddingVertical:32 }]}>
              <Ionicons name="restaurant-outline" size={40} color={C.muted} style={{ marginBottom:10 }} />
              <Text style={styles.muted}>Nenhum alimento registrado ainda.</Text>
            </View>
          ) : histDias.map((dia, di) => (
            <View key={di} style={[styles.card, { marginBottom:10 }]}>
              <View style={[styles.row, { justifyContent:'space-between', marginBottom:8 }]}>
                <Text style={{ color:C.text, fontWeight:'800', fontSize:14 }}>
                  {dia.date.toLocaleDateString('pt-BR', { weekday:'short', day:'numeric', month:'short' })}
                </Text>
                <View style={{ backgroundColor:C.orange+'20', borderRadius:8, paddingHorizontal:8, paddingVertical:3 }}>
                  <Text style={{ color:C.orange, fontWeight:'700', fontSize:12 }}>{Math.round(dia.kcal)} kcal</Text>
                </View>
              </View>
              <View style={[styles.row, { gap:12, marginBottom:8 }]}>
                {[['P', Math.round(dia.prot), C.accent],['C', Math.round(dia.carb), C.orange],['G', Math.round(dia.fat), C.purple]].map(([l,v,c]) => (
                  <Text key={l} style={{ color:C.muted, fontSize:11 }}><Text style={{ color:c, fontWeight:'700' }}>{l}</Text> {v}g</Text>
                ))}
              </View>
              {dia.items.map(e => (
                <View key={e.id} style={[styles.row, { paddingVertical:5, borderTopWidth:1, borderTopColor:C.border }]}>
                  <Text style={{ color:C.text, flex:1, fontSize:12 }}>{e.foodName}</Text>
                  <Text style={[styles.muted, { fontSize:11 }]}>{e.grams}g · {e.kcal} kcal</Text>
                </View>
              ))}
            </View>
          ))}
        </>
      )}
      </Animated.View>

      {/* Add kcal modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Adicionar Calorias</Text>
            <TextInput style={[styles.input, { marginTop:12, width:'100%' }]} placeholder="Quantidade em kcal" placeholderTextColor={C.muted} value={addKcal} onChangeText={setAddKcal} keyboardType="numeric" />
            <View style={[styles.row, { gap:10, marginTop:12, width:'100%' }]}>
              <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={() => { const p = parseInt(addKcal,10); if (!isNaN(p) && p>0) { setExtraKcal(v => v+p); setAddKcal(''); } setShowAdd(false); }}><Text style={styles.bigBtnText}>Adicionar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => { setAddKcal(''); setShowAdd(false); }}><Text style={styles.outlineBtnText}>Cancelar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Food picker modal */}
      <Modal visible={showFoodPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight:'85%', alignItems:'stretch' }]}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:12 }]}>
              <Text style={styles.modalTitle}>{pickerFood ? pickerFood.name : 'Escolher Alimento'}</Text>
              <TouchableOpacity onPress={() => { setPickerFood(null); setPickerGrams(''); setFoodSearch(''); setShowFoodPicker(false); }}>
                <Ionicons name="close" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            {!pickerFood ? (
              <>
                <TextInput style={[styles.input, { marginBottom:10 }]} placeholder="Buscar alimento..." placeholderTextColor={C.muted} value={foodSearch} onChangeText={setFoodSearch} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodCatRow} contentContainerStyle={{ flexDirection:'row', alignItems:'center', paddingBottom:4 }}>
                  {['Todos', ...FOOD_CATEGORIES].map(cat => (
                    <TouchableOpacity key={cat} style={[styles.foodCatChip, foodCategory===cat && styles.foodCatChipOn]} onPress={() => setFoodCategory(cat)}>
                      <Text style={[styles.foodCatChipText, foodCategory===cat && styles.foodCatChipTextOn]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <ScrollView keyboardShouldPersistTaps="handled">
                  {filteredFoods.map(f => (
                    <TouchableOpacity key={f.id} style={styles.foodLibCard} onPress={() => setPickerFood(f)}>
                      <View style={{ flex:1 }}>
                        <Text style={styles.foodLibName}>{f.name}</Text>
                        <Text style={styles.foodLibSub}>{f.kcalPer100} kcal · P:{f.protPer100}g C:{f.carbPer100}g G:{f.fatPer100}g (por 100g)</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.muted} />
                    </TouchableOpacity>
                  ))}
                  {filteredFoods.length === 0 && (
                    <Text style={[styles.muted, { textAlign:'center', marginVertical:16 }]}>Nenhum alimento encontrado.</Text>
                  )}
                  <TouchableOpacity style={[styles.outlineBtn, { marginTop:8, marginBottom:4 }]}
                    onPress={() => { setShowFoodPicker(false); setFoodSearch(''); setShowCreateFood(true); }}>
                    <Text style={styles.outlineBtnText}>Não encontrou? Criar alimento personalizado</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={[styles.muted, { marginBottom:8 }]}>Por 100g: {pickerFood.kcalPer100} kcal · P:{pickerFood.protPer100}g C:{pickerFood.carbPer100}g G:{pickerFood.fatPer100}g</Text>
                <TextInput style={[styles.input, { marginBottom:10 }]} placeholder="Quantidade em gramas" placeholderTextColor={C.muted} value={pickerGrams} onChangeText={setPickerGrams} keyboardType="decimal-pad" autoFocus />
                {pickerCalc && parseFloat(pickerGrams) > 0 && (
                  <View style={[styles.card, { backgroundColor:C.card2, marginBottom:10 }]}>
                    <Text style={[styles.sectionTitle2, { marginBottom:6 }]}>Preview</Text>
                    <Text style={{ color:C.text, fontWeight:'700', fontSize:15 }}>{pickerCalc.kcal} kcal</Text>
                    <Text style={styles.muted}>Proteína: {pickerCalc.prot}g · Carboidrato: {pickerCalc.carb}g · Gordura: {pickerCalc.fat}g</Text>
                  </View>
                )}
                <View style={[styles.row, { gap:10 }]}>
                  <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setPickerFood(null)}><Text style={styles.outlineBtnText}>← Voltar</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={confirmPickerFood}><Text style={styles.bigBtnText}>Registrar</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create custom food modal */}
      <Modal visible={showCreateFood} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight:'85%', alignItems:'stretch' }]}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:12 }]}>
              <Text style={styles.modalTitle}>Criar Alimento</Text>
              <TouchableOpacity onPress={() => setShowCreateFood(false)}><Ionicons name="close" size={22} color={C.muted} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.muted, { marginBottom:8 }]}>Valores por 100g do alimento:</Text>
              {[
                { label:'Nome', val:newFoodName, set:setNewFoodName, type:'default' },
                { label:'Kcal por 100g', val:newFoodKcal, set:setNewFoodKcal, type:'decimal-pad' },
                { label:'Proteína (g/100g)', val:newFoodProt, set:setNewFoodProt, type:'decimal-pad' },
                { label:'Carboidrato (g/100g)', val:newFoodCarb, set:setNewFoodCarb, type:'decimal-pad' },
                { label:'Gordura (g/100g)', val:newFoodFat, set:setNewFoodFat, type:'decimal-pad' },
              ].map(f => (
                <View key={f.label} style={{ marginBottom:8 }}>
                  <Text style={[styles.muted, { fontSize:11, marginBottom:3 }]}>{f.label}</Text>
                  <TextInput style={[styles.input, { width:'100%' }]} placeholder={f.label} placeholderTextColor={C.muted} value={f.val} onChangeText={f.set} keyboardType={f.type} />
                </View>
              ))}
              <View style={[styles.row, { gap:10, marginTop:8 }]}>
                <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setShowCreateFood(false)}><Text style={styles.outlineBtnText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={createCustomFood}><Text style={styles.bigBtnText}>Criar</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── PROGRESSO ────────────────────────────────────────────────────────────────
function ProgressoScreen({ user, historico, setHistorico, medidas, setMedidas, treinosLog, pesoMeta, setPesoMeta, treinoNotas, caloriasLog, conquistas, cardioLog, prRecords, sonoLog, setSonoLog, customFoodLog, aguaGoalLog, prHistory, rpeLog, plannerSemana, metasCustom, setMetasCustom, sessionsHistory }) {
  const { C, styles } = useTheme();
  const screenAnim = useScreenAnimation();
  const [proTab, setProTab]       = useState('peso');
  const [newPeso, setNewPeso]     = useState('');
  const [showPesoModal, setShowPesoModal] = useState(false);
  const [showMedModal, setShowMedModal]   = useState(false);
  const [mCintura, setMCintura]   = useState('');
  const [mBraco, setMBraco]       = useState('');
  const [mPerna, setMPerna]       = useState('');
  const [genero, setGenero]         = useState('M');
  const [rmPeso, setRmPeso]         = useState('');
  const [rmReps, setRmReps]         = useState('');
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaInput, setMetaInput]   = useState(pesoMeta || '');
  const [actFator, setActFator]       = useState(1.55);
  const [sonoHoras, setSonoHoras]     = useState('');
  const [sonoQual, setSonoQual]       = useState(3);
  const [platePeso, setPlatePeso]     = useState('');
  const [plateBar, setPlateBar]       = useState('20');
  const [navyCintura, setNavyCintura] = useState('');
  const [navyPescoco, setNavyPescoco] = useState('');
  const [navyQuadril, setNavyQuadril] = useState('');
  const [navyAltura,  setNavyAltura]  = useState(String(user.altura||''));
  const [selectedPrEx, setSelectedPrEx] = useState(null);

  const [showMetaFormModal, setShowMetaFormModal] = useState(false);
  const [metaFormTitulo, setMetaFormTitulo] = useState('');
  const [metaFormMeta, setMetaFormMeta]     = useState('');
  const [metaFormTipo, setMetaFormTipo]     = useState('treinos');
  const [metaFormFim, setMetaFormFim]       = useState('');

  const proTabs = [
    { id:'peso',     label:'Peso'     },
    { id:'medidas',  label:'Medidas'  },
    { id:'calcular', label:'Calcular' },
    { id:'stats',    label:'Stats'    },
    { id:'cardio',   label:'Cardio'   },
    { id:'pr',       label:'PRs'      },
    { id:'sono',     label:'Sono'     },
    { id:'metas',    label:'Metas'    },
    { id:'historico',label:'Histórico'},
  ];

  const inicial = historico[0].peso;
  const atual   = historico[historico.length-1].peso;
  const diff    = parseFloat((atual - inicial).toFixed(1));
  const cor     = user.objetivo === 'Emagrecimento' ? (diff < 0 ? C.accent : C.danger) : (diff > 0 ? C.accent : C.orange);

  const actualMin = Math.min(...historico.map(h => h.peso));
  const actualMax = Math.max(...historico.map(h => h.peso));
  const minP = actualMin - 1, maxP = actualMax + 1, range = maxP - minP || 1;
  const chartW = width - 64, chartH = 120;
  const points = historico.map((h,i) => ({
    x: historico.length > 1 ? (i/(historico.length-1))*chartW : chartW/2,
    y: chartH - ((h.peso - minP)/range)*chartH,
  }));

  const reversed = [...historico].reverse();

  const imc = parseFloat(user.peso) / Math.pow(parseFloat(user.altura)/100, 2);
  const imcLabel = imc < 18.5 ? 'Abaixo do peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : 'Obesidade';
  const imcColor = imc < 18.5 ? C.blue : imc < 25 ? C.accent : imc < 30 ? C.orange : C.danger;
  const imcPct   = Math.min(Math.max((imc - 15) / (40 - 15), 0), 1);

  const tmb = genero === 'M'
    ? 10*parseFloat(user.peso) + 6.25*parseFloat(user.altura) - 5*parseInt(user.idade,10) + 5
    : 10*parseFloat(user.peso) + 6.25*parseFloat(user.altura) - 5*parseInt(user.idade,10) - 161;

  const rm1 = (rmPeso && rmReps)
    ? (parseFloat(rmPeso) * (1 + parseFloat(rmReps)/30)).toFixed(1)
    : null;

  const currentStreak = calcStreak(treinosLog);
  const maxStreak     = calcMaxStreak(treinosLog);
  const totalTreinos  = (treinosLog || []).length;
  const workout       = WORKOUTS[user.objetivo]?.[user.nivel];

  const compartilhar = async () => {
    const msg = [
      '🏋️ Meu Progresso no NuTreino',
      '',
      `💪 Total de treinos: ${totalTreinos}`,
      `🔥 Sequência atual: ${currentStreak} dia(s)`,
      `🏆 Maior sequência: ${maxStreak} dia(s)`,
      `⚖️ Peso atual: ${user.peso}kg`,
      `📉 Variação: ${diff > 0 ? '+' : ''}${diff}kg`,
      `🎯 Objetivo: ${user.objetivo}`,
      '',
      'Baixe o NuTreino e comece sua jornada! 💪',
    ].join('\n');
    try { await Share.share({ message:msg }); } catch (e) {}
  };

  const salvarMedidas = () => {
    if (!mCintura && !mBraco && !mPerna) { Alert.alert('Atenção', 'Preencha pelo menos uma medida.'); return; }
    const d = new Date();
    const entry = { id:Date.now().toString(), data:`${d.getDate()}/${d.getMonth()+1}`, cintura:mCintura||null, braco:mBraco||null, perna:mPerna||null };
    setMedidas(prev => [...prev, entry]);
    setMCintura(''); setMBraco(''); setMPerna('');
    setShowMedModal(false);
  };

  const ultimaMedida = medidas.length > 0 ? medidas[medidas.length-1] : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom:24 }}>
      <Animated.View style={screenAnim}>
      <View style={styles.subTabRow}>
        {proTabs.map(t => (
          <TouchableOpacity key={t.id} style={[styles.subTab, proTab===t.id && styles.subTabActive]} onPress={() => setProTab(t.id)}>
            <Text style={[styles.subTabText, proTab===t.id && styles.subTabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── PESO ── */}
      {proTab === 'peso' && (
        <>
          <View style={styles.row}>
            {[{label:'Peso Inicial',val:`${inicial}kg`,color:C.muted},{label:'Peso Atual',val:`${atual}kg`,color:C.text},{label:'Variação',val:`${diff>0?'+':''}${diff}kg`,color:cor}].map(c => (
              <View key={c.label} style={[styles.statCard, { flex:1, margin:3 }]}>
                <Text style={[styles.statVal, { color:c.color }]}>{c.val}</Text>
                <Text style={styles.statLabel}>{c.label}</Text>
              </View>
            ))}
          </View>
          {/* Meta de Peso */}
          {pesoMeta ? (
            <View style={styles.metaCard}>
              <View style={[styles.row, { justifyContent:'space-between', marginBottom:10 }]}>
                <Text style={[styles.sectionTitle2]}>🎯 Meta de Peso</Text>
                <TouchableOpacity onPress={() => { setMetaInput(pesoMeta); setShowMetaModal(true); }}>
                  <Ionicons name="create-outline" size={16} color={C.muted} />
                </TouchableOpacity>
              </View>
              <View style={[styles.row, { justifyContent:'space-between', marginBottom:8 }]}>
                <View><Text style={styles.metaLabel}>Peso atual</Text><Text style={styles.metaVal}>{atual}kg</Text></View>
                <Ionicons name="arrow-forward" size={16} color={C.muted} />
                <View style={{ alignItems:'flex-end' }}><Text style={styles.metaLabel}>Meta</Text><Text style={[styles.metaVal, { color:C.purple }]}>{pesoMeta}kg</Text></View>
              </View>
              {(() => {
                const ini = parseFloat(inicial), meta = parseFloat(pesoMeta), at = parseFloat(atual);
                const total = Math.abs(meta - ini); const coberto = Math.abs(at - ini);
                const pct = total > 0 ? Math.min(coberto / total, 1) : 1;
                const falta = Math.abs(meta - at).toFixed(1);
                const atingida = user.objetivo === 'Emagrecimento' ? at <= meta : user.objetivo === 'Ganho de Massa' ? at >= meta : Math.abs(at - meta) < 0.5;
                return (<>
                  <View style={styles.progressBar}><View style={[styles.progressFill, { width:`${pct*100}%`, backgroundColor:C.purple }]} /></View>
                  <Text style={[styles.muted, { marginTop:6, textAlign:'center' }]}>{atingida ? '🏆 Meta atingida! Parabéns!' : `Faltam ${falta}kg para a meta`}</Text>
                </>);
              })()}
            </View>
          ) : (
            <TouchableOpacity style={[styles.outlineBtn, { borderColor:C.purple, marginBottom:4 }]} onPress={() => { setMetaInput(''); setShowMetaModal(true); }}>
              <View style={styles.row}><Ionicons name="flag-outline" size={16} color={C.purple} style={{ marginRight:8 }} /><Text style={[styles.outlineBtnText, { color:C.purple }]}>Definir Meta de Peso</Text></View>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>📈 Evolução de Peso</Text>
          <View style={[styles.card, { paddingVertical:16 }]}>
            <View style={{ height:chartH+40 }}>
              <View style={{ height:chartH, position:'relative', marginHorizontal:4 }}>
                {[0,1,2,3].map(i => <View key={i} style={[styles.gridLine, { top:(chartH/3)*i }]} />)}
                <Text style={[styles.yAxisLabel, { top:-2 }]}>{actualMax.toFixed(1)}</Text>
                <Text style={[styles.yAxisLabel, { top:chartH/2-7 }]}>{((actualMax+actualMin)/2).toFixed(1)}</Text>
                <Text style={[styles.yAxisLabel, { top:chartH-14 }]}>{actualMin.toFixed(1)}</Text>
                {points.map((p,i) => { if (i===0) return null; const prev=points[i-1]; const dx=p.x-prev.x; const dy=p.y-prev.y; const len=Math.sqrt(dx*dx+dy*dy); const angle=Math.atan2(dy,dx)*180/Math.PI; return <View key={`l${i}`} style={{ position:'absolute', left:(prev.x+p.x-len)/2, top:(prev.y+p.y)/2-1, width:len, height:2, backgroundColor:C.accent+'80', transform:[{rotate:`${angle}deg`}] }} />; })}
                {points.map((p,i) => <View key={`d${i}`} style={[styles.chartDot, { left:p.x-5, top:p.y-5, backgroundColor:C.accent }]} />)}
              </View>
              <View style={[styles.row, { justifyContent:'space-between', marginTop:8, paddingHorizontal:4 }]}>
                {historico.map(h => <Text key={h.id} style={[styles.muted, { fontSize:10 }]}>{h.data}</Text>)}
              </View>
            </View>
          </View>
          <Text style={styles.sectionTitle}>📅 Histórico</Text>
          {reversed.map((h,i) => { const ant=reversed[i+1]; const subiu=ant?h.peso>=ant.peso:false; const isGood=user.objetivo==='Ganho de Massa'?subiu:!subiu; return (
            <View key={h.id} style={[styles.histRow, i===0&&{borderColor:C.accent}]}>
              <Text style={styles.histData}>{h.data}</Text>
              <Text style={[styles.histPeso, i===0&&{color:C.accent}]}>{h.peso} kg</Text>
              {ant && (<View style={[styles.row, { flex:1, justifyContent:'flex-end' }]}><Ionicons name={subiu?'trending-up':'trending-down'} size={14} color={isGood?C.accent:C.orange} style={{ marginRight:3 }} /><Text style={[styles.histDiff, { color:isGood?C.accent:C.orange }]}>{Math.abs(h.peso-ant.peso).toFixed(1)}kg</Text></View>)}
            </View>
          ); })}
          <TouchableOpacity style={styles.bigBtn} onPress={() => setShowPesoModal(true)}>
            <View style={styles.row}><Ionicons name="refresh" size={18} color={C.bg} style={{ marginRight:8 }} /><Text style={styles.bigBtnText}>Atualizar Peso</Text></View>
          </TouchableOpacity>
          <Modal visible={showMetaModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Meta de Peso</Text>
                <Text style={[styles.muted, { marginTop:4, marginBottom:12, textAlign:'center' }]}>Qual peso você quer atingir?</Text>
                <TextInput style={[styles.input, { width:'100%' }]} placeholder="Ex: 70" placeholderTextColor={C.muted}
                  value={metaInput} onChangeText={setMetaInput} keyboardType="decimal-pad" />
                <View style={[styles.row, { gap:10, marginTop:14, width:'100%' }]}>
                  <TouchableOpacity style={[styles.bigBtn, { flex:1, backgroundColor:C.purple }]} onPress={() => { const v = parseFloat(metaInput); if (!isNaN(v) && v > 0) setPesoMeta(String(v)); setShowMetaModal(false); }}>
                    <Text style={styles.bigBtnText}>Salvar</Text>
                  </TouchableOpacity>
                  {pesoMeta && <TouchableOpacity style={[styles.outlineBtn, { flex:1, borderColor:C.danger }]} onPress={() => { setPesoMeta(''); setShowMetaModal(false); }}>
                    <Text style={[styles.outlineBtnText, { color:C.danger }]}>Remover</Text>
                  </TouchableOpacity>}
                  {!pesoMeta && <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setShowMetaModal(false)}>
                    <Text style={styles.outlineBtnText}>Cancelar</Text>
                  </TouchableOpacity>}
                </View>
              </View>
            </View>
          </Modal>

          <Modal visible={showPesoModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Registrar Peso</Text>
                <TextInput style={[styles.input, { marginTop:12, width:'100%' }]} placeholder="Novo peso (kg)" placeholderTextColor={C.muted} value={newPeso} onChangeText={setNewPeso} keyboardType="decimal-pad" />
                <View style={[styles.row, { gap:10, marginTop:12, width:'100%' }]}>
                  <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={() => { const p=parseFloat(newPeso); if (!isNaN(p)&&p>0) { const d=new Date(); setHistorico(prev => [...prev, { id:Date.now().toString(), data:`${d.getDate()}/${d.getMonth()+1}`, peso:p }]); setNewPeso(''); } setShowPesoModal(false); }}><Text style={styles.bigBtnText}>Salvar</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => { setNewPeso(''); setShowPesoModal(false); }}><Text style={styles.outlineBtnText}>Cancelar</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* ── MEDIDAS ── */}
      {proTab === 'medidas' && (
        <>
          <Text style={styles.sectionTitle}>📐 Medidas Corporais</Text>
          {ultimaMedida ? (
            <View style={styles.medidaCard}>
              <Text style={{ color:C.text, fontWeight:'700', fontSize:14, marginBottom:10 }}>Última Medição — {ultimaMedida.data}</Text>
              {[['Cintura', ultimaMedida.cintura],['Braço', ultimaMedida.braco],['Perna', ultimaMedida.perna]].map(([lbl,val]) => val ? (
                <View key={lbl} style={styles.medidaRow}>
                  <Text style={styles.medidaLabel}>{lbl}</Text>
                  <Text style={styles.medidaVal}>{val} cm</Text>
                </View>
              ) : null)}
            </View>
          ) : (
            <View style={[styles.card, { alignItems:'center', paddingVertical:28 }]}>
              <Ionicons name="body-outline" size={40} color={C.muted} style={{ marginBottom:10 }} />
              <Text style={styles.muted}>Nenhuma medida registrada ainda.</Text>
            </View>
          )}

          {medidas.length >= 2 && (
            <>
              <Text style={styles.sectionTitle}>📈 Evolução das Medidas</Text>
              {[['cintura','Cintura',C.orange],['braco','Braço',C.accent],['perna','Perna',C.purple]].map(([campo,label,cor]) => {
                const pts = medidas.filter(m => m[campo]).map(m => ({ label:m.data, v:parseFloat(m[campo]), id:m.id }));
                if (pts.length < 2) return null;
                const minV = Math.min(...pts.map(p => p.v)) - 1;
                const maxV = Math.max(...pts.map(p => p.v)) + 1;
                const range = maxV - minV || 1;
                const cW = width - 96, cH = 55;
                const coords = pts.map((p,i) => ({ x: pts.length > 1 ? (i/(pts.length-1))*cW : cW/2, y: cH - ((p.v - minV)/range)*cH }));
                return (
                  <View key={campo} style={[styles.card, { padding:14, marginBottom:8 }]}>
                    <View style={[styles.row, { justifyContent:'space-between', marginBottom:8 }]}>
                      <Text style={styles.sectionTitle2}>{label}</Text>
                      <Text style={{ color:cor, fontWeight:'700', fontSize:14 }}>{pts[pts.length-1].v}cm</Text>
                    </View>
                    <View style={{ height:cH+18 }}>
                      <View style={{ height:cH, position:'relative' }}>
                        {coords.map((p,i) => { if (i===0) return null; const prev=coords[i-1]; const dx=p.x-prev.x; const dy=p.y-prev.y; const len=Math.sqrt(dx*dx+dy*dy); const ang=Math.atan2(dy,dx)*180/Math.PI; return <View key={`l${i}`} style={{ position:'absolute', left:(prev.x+p.x-len)/2, top:(prev.y+p.y)/2-1, width:len, height:2, backgroundColor:cor+'80', transform:[{rotate:`${ang}deg`}] }} />; })}
                        {coords.map((p,i) => <View key={`d${i}`} style={{ position:'absolute', left:p.x-4, top:p.y-4, width:8, height:8, borderRadius:4, backgroundColor:cor }} />)}
                      </View>
                      <View style={[styles.row, { justifyContent:'space-between', marginTop:4 }]}>
                        {pts.map(p => <Text key={p.id} style={[styles.muted, { fontSize:9 }]}>{p.label}</Text>)}
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {medidas.length > 1 && (
            <>
              <Text style={styles.sectionTitle}>Histórico de Medidas</Text>
              {[...medidas].reverse().slice(0,5).map((m,i) => (
                <View key={m.id} style={styles.medidaCard}>
                  <Text style={{ color:C.muted, fontSize:12, marginBottom:6 }}>{m.data}</Text>
                  <View style={styles.row}>
                    {m.cintura && <View style={{ marginRight:16 }}><Text style={styles.medidaLabel}>Cintura</Text><Text style={styles.medidaVal}>{m.cintura}cm</Text></View>}
                    {m.braco   && <View style={{ marginRight:16 }}><Text style={styles.medidaLabel}>Braço</Text><Text style={styles.medidaVal}>{m.braco}cm</Text></View>}
                    {m.perna   && <View><Text style={styles.medidaLabel}>Perna</Text><Text style={styles.medidaVal}>{m.perna}cm</Text></View>}
                  </View>
                </View>
              ))}
            </>
          )}

          <TouchableOpacity style={styles.bigBtn} onPress={() => setShowMedModal(true)}>
            <View style={styles.row}><Ionicons name="add-circle-outline" size={18} color={C.bg} style={{ marginRight:8 }} /><Text style={styles.bigBtnText}>Registrar Medidas</Text></View>
          </TouchableOpacity>

          <Modal visible={showMedModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalBox, { maxHeight:'85%' }]}>
                <ScrollView keyboardShouldPersistTaps="handled" style={{ width:'100%' }}>
                  <Text style={styles.modalTitle}>Registrar Medidas</Text>
                  <Text style={[styles.muted, { marginTop:4, marginBottom:16, textAlign:'center' }]}>Preencha as medidas em centímetros</Text>
                  {[['Cintura (cm)', mCintura, setMCintura],['Braço (cm)', mBraco, setMBraco],['Perna (cm)', mPerna, setMPerna]].map(([lbl,val,setter]) => (
                    <View key={lbl}>
                      <Text style={styles.setupLabel}>{lbl}</Text>
                      <TextInput style={[styles.input, { marginBottom:12 }]} placeholder="Ex: 85" placeholderTextColor={C.muted} value={val} onChangeText={setter} keyboardType="numeric" />
                    </View>
                  ))}
                  <View style={[styles.row, { gap:10, marginTop:4 }]}>
                    <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={salvarMedidas}><Text style={styles.bigBtnText}>Salvar</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setShowMedModal(false)}><Text style={styles.outlineBtnText}>Cancelar</Text></TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* ── CALCULAR ── */}
      {proTab === 'calcular' && (
        <>
          {/* IMC */}
          <View style={styles.calcCard}>
            <Text style={styles.calcTitle}>📊 IMC — Índice de Massa Corporal</Text>
            <Text style={[styles.calcResult, { color:imcColor }]}>{imc.toFixed(1)}</Text>
            <Text style={[styles.calcSub, { color:imcColor, fontWeight:'700' }]}>{imcLabel}</Text>
            <View style={[styles.progressBar, { height:10, borderRadius:5, marginBottom:10 }]}>
              <View style={[styles.progressFill, { width:`${imcPct*100}%`, height:10, borderRadius:5, backgroundColor:imcColor }]} />
            </View>
            <View style={[styles.row, { justifyContent:'space-between' }]}>
              {[['<18.5','Abaixo',C.blue],['18.5-24','Normal',C.accent],['25-29','Sobrepeso',C.orange],['30+','Obeso',C.danger]].map(([r,l,cl]) => (
                <View key={r} style={{ alignItems:'center', flex:1 }}>
                  <View style={{ width:12, height:12, borderRadius:6, backgroundColor:cl, marginBottom:3 }} />
                  <Text style={[styles.muted, { fontSize:9, textAlign:'center' }]}>{l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* TMB */}
          <View style={styles.calcCard}>
            <Text style={styles.calcTitle}>🔥 TMB — Taxa Metabólica Basal</Text>
            <View style={styles.generoRow}>
              {[['M','Masculino'],['F','Feminino']].map(([g,l]) => (
                <TouchableOpacity key={g} style={[styles.generoBtn, genero===g && styles.generoBtnActive]} onPress={() => setGenero(g)}>
                  <Text style={[styles.generoBtnText, genero===g && styles.generoBtnTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.calcResult, { color:C.orange }]}>{Math.round(tmb)}</Text>
            <Text style={styles.calcSub}>kcal/dia em repouso</Text>
            <View style={{ borderTopWidth:1, borderTopColor:C.border, paddingTop:10 }}>
              {[['Sedentário',1.2],['Levemente ativo',1.375],['Moderado',1.55],['Muito ativo',1.725]].map(([l,f]) => (
                <TouchableOpacity key={l} onPress={() => setActFator(f)}
                  style={[styles.row, { justifyContent:'space-between', paddingVertical:8, paddingHorizontal:10, borderRadius:10, marginBottom:3,
                    backgroundColor: actFator===f ? C.accent+'18' : 'transparent',
                    borderWidth:1, borderColor: actFator===f ? C.accent+'60' : 'transparent' }]}>
                  <Text style={[styles.muted, { fontSize:12, flex:1 }, actFator===f && { color:C.accent, fontWeight:'700' }]}>{l}</Text>
                  <Text style={{ color: actFator===f ? C.accent : C.text, fontWeight:'700', fontSize:13 }}>{Math.round(tmb*f)} kcal</Text>
                  {actFator===f && <Ionicons name="checkmark-circle" size={16} color={C.accent} style={{ marginLeft:6 }} />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ backgroundColor:C.orange+'18', borderRadius:14, padding:14, marginTop:10, alignItems:'center', borderWidth:1, borderColor:C.orange+'40' }}>
              <Text style={{ color:C.muted, fontSize:12, marginBottom:2 }}>TDEE — Gasto Total Diário</Text>
              <Text style={{ color:C.orange, fontSize:38, fontWeight:'900' }}>{Math.round(tmb * actFator)}</Text>
              <Text style={{ color:C.muted, fontSize:11 }}>kcal/dia</Text>
              {(() => {
                const tdee = Math.round(tmb * actFator);
                const meta = user.objetivo === 'Emagrecimento' ? tdee - 500 : user.objetivo === 'Ganho de Massa' ? tdee + 300 : tdee;
                const seta = user.objetivo === 'Emagrecimento' ? '↓ déficit' : user.objetivo === 'Ganho de Massa' ? '↑ superávit' : '= manutenção';
                return <Text style={{ color:C.accent, fontSize:12, fontWeight:'700', marginTop:8 }}>Meta sugerida: {meta} kcal ({seta})</Text>;
              })()}
            </View>
          </View>

          {/* 1RM */}
          <View style={styles.calcCard}>
            <Text style={styles.calcTitle}>💪 1RM — Repetição Máxima (Epley)</Text>
            <Text style={[styles.setupLabel]}>Carga utilizada (kg)</Text>
            <TextInput style={[styles.input, { marginBottom:12 }]} placeholder="Ex: 80" placeholderTextColor={C.muted} value={rmPeso} onChangeText={setRmPeso} keyboardType="decimal-pad" />
            <Text style={styles.setupLabel}>Repetições realizadas</Text>
            <TextInput style={[styles.input, { marginBottom:16 }]} placeholder="Ex: 8" placeholderTextColor={C.muted} value={rmReps} onChangeText={setRmReps} keyboardType="numeric" />
            {rm1 ? (
              <View style={[styles.card, { backgroundColor:C.accent+'14', borderColor:C.accent, margin:0, marginBottom:0 }]}>
                <Text style={[styles.muted, { textAlign:'center' }]}>1RM Estimado</Text>
                <Text style={[styles.calcResult, { color:C.accent, textAlign:'center', marginBottom:0 }]}>{rm1} kg</Text>
              </View>
            ) : (
              <Text style={[styles.muted, { textAlign:'center' }]}>Preencha os campos para calcular</Text>
            )}
          </View>

          {/* Calculadora de Anilhas */}
          <View style={styles.calcCard}>
            <Text style={styles.calcTitle}>🏋️ Calculadora de Anilhas</Text>
            <Text style={styles.setupLabel}>Peso total desejado (kg)</Text>
            <TextInput style={[styles.input, { marginBottom:12 }]} placeholder="Ex: 100" placeholderTextColor={C.muted} value={platePeso} onChangeText={setPlatePeso} keyboardType="decimal-pad" />
            <Text style={styles.setupLabel}>Peso da barra (kg)</Text>
            <View style={[styles.row, { gap:8, marginBottom:16 }]}>
              {['10','15','20'].map(b => (
                <TouchableOpacity key={b} onPress={() => setPlateBar(b)}
                  style={[{ flex:1, paddingVertical:10, borderRadius:12, borderWidth:2, alignItems:'center',
                    borderColor: plateBar===b ? C.accent : C.border,
                    backgroundColor: plateBar===b ? C.accent+'18' : 'transparent' }]}>
                  <Text style={{ color:plateBar===b?C.accent:C.muted, fontWeight:'700' }}>{b}kg</Text>
                </TouchableOpacity>
              ))}
            </View>
            {(() => {
              const total = parseFloat(platePeso);
              const bar   = parseFloat(plateBar);
              if (!platePeso || isNaN(total) || isNaN(bar)) return <Text style={[styles.muted, { textAlign:'center' }]}>Insira o peso para calcular</Text>;
              const result = calcPlates(total, bar);
              if (!result) return <Text style={[styles.muted, { textAlign:'center', color:C.danger }]}>Peso menor que a barra ({bar}kg)</Text>;
              const grouped = result.plates.reduce((acc, p) => { acc[p] = (acc[p]||0)+1; return acc; }, {});
              return (
                <View style={{ backgroundColor:C.accent+'12', borderRadius:14, padding:14, borderWidth:1, borderColor:C.accent+'40' }}>
                  <Text style={{ color:C.muted, textAlign:'center', fontSize:11, marginBottom:8 }}>
                    Barra {bar}kg + {result.perSide}kg por lado
                  </Text>
                  {result.plates.length === 0 ? (
                    <Text style={{ color:C.accent, textAlign:'center', fontWeight:'700' }}>Apenas a barra ({bar}kg)</Text>
                  ) : (
                    <View style={[styles.row, { flexWrap:'wrap', gap:8, justifyContent:'center', marginBottom:6 }]}>
                      {Object.entries(grouped).map(([p,n]) => (
                        <View key={p} style={{ backgroundColor:C.accent, borderRadius:10, paddingHorizontal:12, paddingVertical:6, alignItems:'center' }}>
                          <Text style={{ color:'#fff', fontWeight:'900', fontSize:16 }}>{p}kg</Text>
                          <Text style={{ color:'#ffffff99', fontSize:10 }}>×{n} por lado</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {!result.exact && <Text style={{ color:C.orange, fontSize:11, textAlign:'center' }}>⚠ Combinação aproximada — não é possível atingir exatamente com as anilhas disponíveis.</Text>}
                </View>
              );
            })()}
          </View>

          {/* % Gordura Corporal — Navy Method */}
          <View style={styles.calcCard}>
            <Text style={styles.calcTitle}>⚖️ % Gordura Corporal — Método Navy</Text>
            <Text style={[styles.muted, { fontSize:11, marginBottom:12 }]}>Meça ao nível do umbigo (cintura), base do pescoço (pescoço) e topo do quadril (só mulheres).</Text>
            <View style={styles.generoRow}>
              {[['M','Masculino'],['F','Feminino']].map(([g,l]) => (
                <TouchableOpacity key={g} style={[styles.generoBtn, genero===g && styles.generoBtnActive]} onPress={() => setGenero(g)}>
                  <Text style={[styles.generoBtnText, genero===g && styles.generoBtnTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {[
              { label:'Cintura (cm)', val:navyCintura, set:setNavyCintura },
              { label:'Pescoço (cm)', val:navyPescoco, set:setNavyPescoco },
              ...(genero==='F'?[{ label:'Quadril (cm)', val:navyQuadril, set:setNavyQuadril }]:[]),
              { label:'Altura (cm)', val:navyAltura, set:setNavyAltura },
            ].map(f=>(
              <View key={f.label}>
                <Text style={styles.setupLabel}>{f.label}</Text>
                <TextInput style={[styles.input, { marginBottom:10 }]} placeholder="cm" placeholderTextColor={C.muted}
                  value={f.val} onChangeText={f.set} keyboardType="decimal-pad" />
              </View>
            ))}
            {(() => {
              const c=parseFloat(navyCintura), p=parseFloat(navyPescoco), h=parseFloat(navyAltura), q=parseFloat(navyQuadril);
              if (!c||!p||!h) return <Text style={[styles.muted,{textAlign:'center'}]}>Preencha os campos para calcular</Text>;
              let bf;
              if (genero==='M') bf = 86.010*Math.log10(c-p) - 70.041*Math.log10(h) + 36.76;
              else { if(!q) return <Text style={[styles.muted,{textAlign:'center'}]}>Preencha o quadril</Text>; bf = 163.205*Math.log10(c+q-p) - 97.684*Math.log10(h) - 78.387; }
              bf = Math.max(0, Math.round(bf*10)/10);
              const [cat, clr] = genero==='M'
                ? bf<6?['Essencial',C.blue]:bf<14?['Atlético',C.accent]:bf<18?['Bom',C.accent]:bf<25?['Normal',C.orange]:['Acima',C.danger]
                : bf<14?['Essencial',C.blue]:bf<21?['Atlético',C.accent]:bf<25?['Bom',C.accent]:bf<32?['Normal',C.orange]:['Acima',C.danger];
              return (
                <View style={{ backgroundColor:clr+'14', borderRadius:14, padding:14, alignItems:'center', borderWidth:1, borderColor:clr+'40' }}>
                  <Text style={{ color:C.muted, fontSize:12, marginBottom:4 }}>Gordura Corporal Estimada</Text>
                  <Text style={{ color:clr, fontSize:42, fontWeight:'900' }}>{bf}%</Text>
                  <Text style={{ color:clr, fontWeight:'700', marginTop:4 }}>{cat}</Text>
                </View>
              );
            })()}
          </View>
        </>
      )}

      {/* ── STATS ── */}
      {proTab === 'stats' && (
        <>
          {/* ── Volume por Grupo Muscular ── */}
          {(() => {
            const today = new Date(); today.setHours(0,0,0,0);
            const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
            const weekLogs  = (treinosLog||[]).filter(d => { const dt=new Date(d); dt.setHours(0,0,0,0); return dt>=weekStart && dt<=today; });
            const grupos = {};
            weekLogs.forEach(d => {
              const dt = new Date(d);
              const { grupo } = getPlanDay(plannerSemana, dt.getDay());
              if (grupo) grupos[grupo] = (grupos[grupo]||0) + 1;
            });
            const entries = Object.entries(grupos);
            if (!entries.length) return null;
            return (
              <View style={[styles.card, { marginBottom:12 }]}>
                <Text style={[styles.sectionTitle2, { marginBottom:12 }]}>💪 Volume Semanal por Grupo Muscular</Text>
                {entries.map(([gId, count]) => {
                  const gInfo = GRUPOS_MUSCULARES.find(g => g.id === gId);
                  if (!gInfo) return null;
                  const pct = Math.min(count/2, 1);
                  return (
                    <View key={gId} style={{ marginBottom:10 }}>
                      <View style={[styles.row, { justifyContent:'space-between', marginBottom:4 }]}>
                        <Text style={{ color:C.text, fontWeight:'700', fontSize:13 }}>{gInfo.label}</Text>
                        <Text style={{ color:pct>=1?C.accent:C.muted, fontSize:12, fontWeight:'700' }}>{count}x esta semana</Text>
                      </View>
                      <View style={[styles.progressBar, { height:8, borderRadius:4 }]}>
                        <View style={[styles.progressFill, { width:`${pct*100}%`, height:8, borderRadius:4, backgroundColor:gInfo.cor }]} />
                      </View>
                    </View>
                  );
                })}
                <Text style={[styles.muted, { fontSize:10, textAlign:'center', marginTop:4 }]}>*Baseado no planejador · Meta: 2 sessões/semana por grupo</Text>
              </View>
            );
          })()}

          {/* ── Desafios Semanais ── */}
          {(() => {
            const today = new Date(); today.setHours(0,0,0,0);
            const dow = today.getDay();
            const weekStart = new Date(today); weekStart.setDate(today.getDate() - dow);
            const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);
            const inWeek = (dateStr) => { const dt = new Date(dateStr); return dt >= weekStart && dt <= weekEnd; };
            const treinosWeek = (treinosLog||[]).filter(inWeek).length;
            const aguaWeek    = (aguaGoalLog||[]).filter(inWeek).length;
            const cardioWeek  = (cardioLog||[]).filter(l => inWeek(l.date||'')).length;
            const sonoWeek    = (sonoLog||[]).filter(s => inWeek(s.date||'')).filter(s => (s.horas||0) >= 7).length;
            const dietaWeek   = (() => {
              const days = new Set();
              (customFoodLog||[]).filter(e => inWeek(e.date||'')).forEach(e => days.add(new Date(e.date).toDateString()));
              return days.size;
            })();
            const prWeek = Object.values((prRecords)||{}).filter(r => r?.date && inWeek(r.date)).length > 0 ? 1 : 0;
            const data = { treinosWeek, aguaWeek, cardioWeek, sonoWeek, dietaWeek, prWeek };
            return (
              <View style={[styles.card, { marginBottom:12 }]}>
                <Text style={[styles.sectionTitle2, { marginBottom:12 }]}>🎯 Desafios desta Semana</Text>
                {DESAFIOS_SEMANAIS.map(d => {
                  const val = Math.min(d.get(data), d.max);
                  const pct = val / d.max;
                  const done = pct >= 1;
                  return (
                    <View key={d.id} style={{ marginBottom:12 }}>
                      <View style={[styles.row, { justifyContent:'space-between', marginBottom:4 }]}>
                        <View style={styles.row}>
                          <Text style={{ fontSize:16, marginRight:6 }}>{d.emoji}</Text>
                          <Text style={{ color:done?C.accent:C.text, fontWeight:'700', fontSize:13 }}>{d.title}</Text>
                          {done && <Text style={{ marginLeft:6, fontSize:13 }}>✅</Text>}
                        </View>
                        <Text style={{ color:done?C.accent:C.muted, fontWeight:'700', fontSize:12 }}>{val}/{d.max}</Text>
                      </View>
                      <View style={[styles.progressBar, { height:6, borderRadius:3 }]}>
                        <View style={[styles.progressFill, { width:`${pct*100}%`, height:6, borderRadius:3, backgroundColor:done?C.accent:C.orange }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}

          <Text style={styles.sectionTitle}>📊 Estatísticas Gerais</Text>
          <View style={styles.card}>
            {[
              ['Total de treinos realizados', `${totalTreinos} treino${totalTreinos!==1?'s':''}`],
              ['Sequência atual',             `${currentStreak} dia${currentStreak!==1?'s':''} 🔥`],
              ['Maior sequência',             `${maxStreak} dia${maxStreak!==1?'s':''} 🏆`],
              ['Objetivo atual',              user.objetivo],
              ['Nível',                       user.nivel],
              ['Treino atual',                workout?.name || '-'],
            ].map(([lbl,val],i,arr) => (
              <View key={lbl} style={[styles.statsRow, i===arr.length-1 && { borderBottomWidth:0 }]}>
                <Text style={styles.statsLabel}>{lbl}</Text>
                <Text style={styles.statsVal}>{val}</Text>
              </View>
            ))}
          </View>

          <View style={styles.row}>
            {[{label:'Peso Inicial',val:`${inicial}kg`,color:C.muted},{label:'Peso Atual',val:`${atual}kg`,color:C.text},{label:'Variação',val:`${diff>0?'+':''}${diff}kg`,color:cor}].map(c => (
              <View key={c.label} style={[styles.statCard, { flex:1, margin:3 }]}>
                <Text style={[styles.statVal, { color:c.color }]}>{c.val}</Text>
                <Text style={styles.statLabel}>{c.label}</Text>
              </View>
            ))}
          </View>

          {/* Gráfico de calorias semanal */}
          {/* Training frequency chart */}
          {(() => {
            const hoje = new Date(); hoje.setHours(0,0,0,0);
            const semanas = Array.from({length:8}, (_,i) => {
              const fim = new Date(hoje); fim.setDate(hoje.getDate() - i * 7);
              const ini = new Date(fim); ini.setDate(fim.getDate() - 6);
              const count = (treinosLog||[]).filter(d => {
                const dt = new Date(d); dt.setHours(0,0,0,0);
                return dt >= ini && dt <= fim;
              }).length;
              const label = `${String(ini.getDate()).padStart(2,'0')}/${String(ini.getMonth()+1).padStart(2,'0')}`;
              return { label, count };
            }).reverse();
            const maxCount = Math.max(...semanas.map(w => w.count), 1);
            return (
              <View style={styles.freqCard}>
                {/* RPE mini chart */}
                {(rpeLog||[]).length >= 2 && (() => {
                  const last8 = [...(rpeLog||[])].sort((a,b)=>a.date>b.date?1:-1).slice(-8);
                  const maxR = 8;
                  return (
                    <View style={{ marginBottom:16 }}>
                      <Text style={[styles.sectionTitle2, { marginBottom:8 }]}>😤 Esforço Percebido (RPE) — Últimas sessões</Text>
                      <View style={styles.barChart}>
                        {last8.map((r,i) => {
                          const pct = r.rpe / maxR;
                          const clr = r.rpe>=7?C.danger:r.rpe>=5?C.orange:C.accent;
                          return (
                            <View key={i} style={styles.barWrap}>
                              <Text style={[styles.barValue, { fontSize:9 }]}>{r.rpe}</Text>
                              <View style={[styles.bar, { height:Math.max(pct*60,4), backgroundColor:clr }]} />
                              <Text style={[styles.barLabel, { fontSize:8 }]}>{r.date.slice(5)}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}
                <Text style={[styles.sectionTitle2, {marginBottom:10}]}>📅 Frequência de Treinos — 8 semanas</Text>
                <View style={styles.barChart}>
                  {semanas.map((w, i) => (
                    <View key={i} style={styles.barWrap}>
                      <Text style={styles.barValue}>{w.count > 0 ? w.count : ''}</Text>
                      <View style={[styles.bar, {
                        height: Math.max((w.count / maxCount) * 70, w.count > 0 ? 6 : 2),
                        backgroundColor: w.count >= 4 ? C.accent : w.count >= 2 ? C.blue : w.count > 0 ? C.orange : C.border,
                      }]} />
                      <Text style={styles.barLabel}>{w.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.row, {justifyContent:'center', marginTop:8, gap:14}]}>
                  <View style={styles.calLegendItem}><View style={[styles.calLegendDot,{backgroundColor:C.accent}]}/><Text style={styles.calLegendText}>4+ treinos</Text></View>
                  <View style={styles.calLegendItem}><View style={[styles.calLegendDot,{backgroundColor:C.blue}]}/><Text style={styles.calLegendText}>2–3</Text></View>
                  <View style={styles.calLegendItem}><View style={[styles.calLegendDot,{backgroundColor:C.orange}]}/><Text style={styles.calLegendText}>1</Text></View>
                </View>
              </View>
            );
          })()}

          {/* ── Heatmap de Atividade ── */}
          {(() => {
            const CELL = 13, GAP = 2;
            const today = new Date(); today.setHours(0,0,0,0);
            const dow = today.getDay();
            const weekStart = new Date(today); weekStart.setDate(today.getDate() - dow);
            const heatStart = new Date(weekStart); heatStart.setDate(weekStart.getDate() - 15 * 7);
            const weeks = [];
            for (let w = 0; w < 16; w++) {
              const days = [];
              for (let d = 0; d < 7; d++) {
                const dt = new Date(heatStart); dt.setDate(heatStart.getDate() + w * 7 + d);
                const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                const hasTreino = (treinosLog||[]).includes(key);
                const hasCardio = (cardioLog||[]).some(l => l.date === key);
                const isFuture  = dt > today;
                days.push({ key, hasTreino, hasCardio, isFuture });
              }
              weeks.push(days);
            }
            return (
              <View style={[styles.card, { marginBottom:12 }]}>
                <Text style={[styles.sectionTitle2, { marginBottom:10 }]}>🗓 Heatmap de Atividade</Text>
                <View style={{ flexDirection:'row', alignItems:'flex-start' }}>
                  <View style={{ marginRight:4 }}>
                    {['D','S','T','Q','Q','S','S'].map((l,i) => (
                      <View key={i} style={{ height:CELL+GAP, justifyContent:'center' }}>
                        <Text style={{ color:[1,3,5].includes(i)?C.muted:'transparent', fontSize:8, width:9 }}>{l}</Text>
                      </View>
                    ))}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection:'row', gap:GAP }}>
                      {weeks.map((week, w) => (
                        <View key={w} style={{ flexDirection:'column', gap:GAP }}>
                          {week.map((cell, d) => (
                            <View key={d} style={{
                              width:CELL, height:CELL, borderRadius:3,
                              backgroundColor: cell.isFuture ? 'transparent'
                                : (cell.hasTreino && cell.hasCardio) ? C.purple
                                : cell.hasTreino ? C.accent
                                : cell.hasCardio ? C.blue
                                : C.card2,
                            }} />
                          ))}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                <View style={[styles.row, { justifyContent:'center', marginTop:8, gap:12, flexWrap:'wrap' }]}>
                  <View style={styles.calLegendItem}><View style={[styles.calLegendDot,{backgroundColor:C.accent}]}/><Text style={styles.calLegendText}>Treino</Text></View>
                  <View style={styles.calLegendItem}><View style={[styles.calLegendDot,{backgroundColor:C.blue}]}/><Text style={styles.calLegendText}>Cardio</Text></View>
                  <View style={styles.calLegendItem}><View style={[styles.calLegendDot,{backgroundColor:C.purple}]}/><Text style={styles.calLegendText}>Ambos</Text></View>
                  <View style={styles.calLegendItem}><View style={[styles.calLegendDot,{backgroundColor:C.card2}]}/><Text style={styles.calLegendText}>Sem atividade</Text></View>
                </View>
              </View>
            );
          })()}

          {caloriasLog?.length > 0 && (() => {
            const ultimos = caloriasLog.slice(-7);
            const metaKcal = MEALS[user.objetivo].calorias;
            const maxKcal  = Math.max(...ultimos.map(d => d.kcal), metaKcal, 1);
            return (
              <View style={styles.card}>
                <Text style={[styles.sectionTitle2, {marginBottom:10}]}>📊 Calorias — Últimos {ultimos.length} dias</Text>
                <View style={styles.barChart}>
                  {ultimos.map((d, i) => {
                    const pct  = d.kcal / maxKcal;
                    const bateu = d.kcal >= metaKcal * 0.8;
                    const [dia, mes] = d.date.split('-').slice(2).concat(d.date.split('-').slice(1,2));
                    return (
                      <View key={i} style={styles.barWrap}>
                        <Text style={styles.barValue}>{d.kcal >= 1000 ? `${(d.kcal/1000).toFixed(1)}k` : d.kcal}</Text>
                        <View style={[styles.bar, { height: Math.max(pct * 70, 4), backgroundColor: bateu ? C.accent : C.orange }]} />
                        <Text style={styles.barLabel}>{d.date.split('-')[2]}/{d.date.split('-')[1]}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={[styles.row, {justifyContent:'center', marginTop:8, gap:16}]}>
                  <View style={styles.calLegendItem}><View style={[styles.calLegendDot,{backgroundColor:C.accent}]}/><Text style={styles.calLegendText}>≥ 80% da meta</Text></View>
                  <View style={styles.calLegendItem}><View style={[styles.calLegendDot,{backgroundColor:C.orange}]}/><Text style={styles.calLegendText}>Abaixo</Text></View>
                </View>
              </View>
            );
          })()}

          {treinoNotas?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>📝 Notas dos Treinos</Text>
              {[...treinoNotas].reverse().slice(0,5).map(n => (
                <View key={n.id} style={styles.notaChip}>
                  <Text style={styles.notaData}>{n.data} — {n.treino}</Text>
                  <Text style={styles.notaText}>{n.nota}</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.analysisCard}>
            <Text style={[styles.sectionTitle2, { marginBottom:8 }]}>🤖 Análise Inteligente</Text>
            <Text style={styles.analysisText}>
              {generateAnalysis(user, treinosLog, historico, caloriasLog, [], currentStreak, maxStreak)}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>🏅 Conquistas</Text>
          <View style={styles.achGrid}>
            {ACHIEVEMENTS.map(a => {
              const unlocked = (conquistas||[]).includes(a.id);
              return (
                <View key={a.id} style={[styles.achItem, unlocked && styles.achItemUnlocked]}>
                  <Text style={styles.achEmoji}>{unlocked ? a.emoji : '🔒'}</Text>
                  <Text style={[styles.achTitle, !unlocked && styles.achLocked]}>{a.title}</Text>
                  <Text style={[styles.achDesc, !unlocked && styles.achLocked]}>{a.desc}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.bigBtn, { backgroundColor:C.blue }]} onPress={compartilhar}>
            <View style={styles.row}><Ionicons name="share-social-outline" size={18} color="#fff" style={{ marginRight:8 }} /><Text style={[styles.bigBtnText, { color:'#fff' }]}>Compartilhar Progresso</Text></View>
          </TouchableOpacity>
        </>
      )}

      {/* ── PRs ── */}
      {proTab === 'pr' && (
        <>
          <Text style={styles.sectionTitle}>🏆 Recordes Pessoais</Text>
          <Text style={[styles.muted, { marginBottom:14, fontSize:12 }]}>Registre séries nos treinos para salvar seus PRs automaticamente.</Text>
          {Object.keys(prRecords||{}).length === 0 ? (
            <View style={[styles.card, { alignItems:'center', paddingVertical:36 }]}>
              <Ionicons name="trophy-outline" size={44} color={C.muted} style={{ marginBottom:12 }} />
              <Text style={[styles.muted, { fontWeight:'700', marginBottom:6 }]}>Nenhum PR ainda</Text>
              <Text style={[styles.muted, { fontSize:11, textAlign:'center' }]}>Complete um treino com cargas registradas para ver seus recordes aqui.</Text>
            </View>
          ) : (
            Object.values(prRecords||{}).sort((a,b) => (b.date||'') > (a.date||'') ? 1 : -1).map((pr) => (
              <TouchableOpacity key={pr.name} onPress={() => setSelectedPrEx(selectedPrEx===pr.name?null:pr.name)}
                style={[styles.card, { marginBottom:8, paddingVertical:14 }]}>
                <View style={[styles.row, { alignItems:'center' }]}>
                  <View style={{ width:46, height:46, borderRadius:23, backgroundColor:C.accent+'22', alignItems:'center', justifyContent:'center', marginRight:12, borderWidth:1, borderColor:C.accent+'44' }}>
                    <Text style={{ fontSize:22 }}>🏋️</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ color:C.text, fontWeight:'800', fontSize:14 }} numberOfLines={1}>{pr.name}</Text>
                    <Text style={{ color:C.muted, fontSize:11, marginTop:2 }}>{pr.date ? pr.date.split('-').reverse().join('/') : '—'}</Text>
                  </View>
                  <View style={{ alignItems:'flex-end' }}>
                    <Text style={{ color:C.accent, fontWeight:'900', fontSize:26 }}>{pr.w}<Text style={{ fontSize:13, color:C.muted, fontWeight:'400' }}> kg</Text></Text>
                    {pr.reps > 0 && <Text style={{ color:C.muted, fontSize:11 }}>{pr.reps} rep</Text>}
                  </View>
                </View>
                {/* ── Gráfico de evolução ── */}
                {selectedPrEx === pr.name && (() => {
                  const hist = (prHistory||{})[pr.name];
                  if (!hist || hist.length < 2) return <Text style={[styles.muted, { fontSize:11, marginTop:10, textAlign:'center' }]}>Complete mais treinos para ver a evolução.</Text>;
                  const sorted = [...hist].sort((a,b) => a.date>b.date?1:-1).slice(-10);
                  const maxW   = Math.max(...sorted.map(h=>h.w));
                  return (
                    <View style={{ marginTop:12 }}>
                      <Text style={{ color:C.muted, fontSize:11, marginBottom:8 }}>📈 Evolução (últimas {sorted.length} sessões)</Text>
                      <View style={[styles.barChart, { alignItems:'flex-end' }]}>
                        {sorted.map((h,i) => {
                          const pct = h.w / maxW;
                          const isLast = i === sorted.length - 1;
                          return (
                            <View key={i} style={styles.barWrap}>
                              <Text style={[styles.barValue, { fontSize:9 }]}>{h.w}kg</Text>
                              <View style={[styles.bar, { height:Math.max(pct*60,4), backgroundColor:isLast?C.accent:C.accent+'66' }]} />
                              <Text style={[styles.barLabel, { fontSize:8 }]}>{h.date.slice(5)}</Text>
                            </View>
                          );
                        })}
                      </View>
                      {sorted.length >= 2 && (() => {
                        const delta = Math.round((sorted[sorted.length-1].w - sorted[0].w)*10)/10;
                        return <Text style={{ color:delta>0?C.accent:delta<0?C.danger:C.muted, fontSize:12, fontWeight:'700', textAlign:'center', marginTop:6 }}>
                          {delta>0?'📈':'📉'} {delta>0?'+':''}{delta}kg desde a primeira sessão
                        </Text>;
                      })()}
                    </View>
                  );
                })()}
              </TouchableOpacity>
            ))
          )}
        </>
      )}

      {/* ── SONO ── */}
      {proTab === 'sono' && (
        <>
          <Text style={styles.sectionTitle}>😴 Diário de Sono</Text>

          {/* Registro */}
          <View style={styles.card}>
            <Text style={[styles.sectionTitle2, { marginBottom:10 }]}>Registrar sono de hoje</Text>
            <Text style={styles.setupLabel}>Horas dormidas</Text>
            <TextInput style={[styles.input, { marginBottom:12 }]} placeholder="Ex: 7.5" placeholderTextColor={C.muted}
              value={sonoHoras} onChangeText={setSonoHoras} keyboardType="decimal-pad" />
            <Text style={[styles.setupLabel, { marginBottom:8 }]}>Qualidade do sono</Text>
            <View style={[styles.row, { gap:8, marginBottom:14 }]}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setSonoQual(n)}
                  style={{ flex:1, paddingVertical:10, borderRadius:12, alignItems:'center',
                    backgroundColor: sonoQual>=n ? C.accent+'30' : C.card2,
                    borderWidth:1.5, borderColor: sonoQual>=n ? C.accent : C.border }}>
                  <Text style={{ fontSize:18 }}>{['😩','😔','😐','😊','😴'][n-1]}</Text>
                  <Text style={{ fontSize:9, color: sonoQual>=n ? C.accent : C.muted, marginTop:2, fontWeight:'700' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.bigBtn} onPress={() => {
              const h = parseFloat(sonoHoras);
              if (isNaN(h) || h <= 0 || h > 24) { Alert.alert('Atenção', 'Informe um valor válido de horas (0–24).'); return; }
              const entry = { id: Date.now().toString(), date: todayKey(), horas: h, qualidade: sonoQual };
              setSonoLog(prev => {
                const filtered = (prev||[]).filter(e => e.date !== todayKey());
                return [...filtered, entry].slice(-60);
              });
              setSonoHoras(''); setSonoQual(3);
              Alert.alert('✅ Registrado!', `${h}h de sono com qualidade ${sonoQual}/5.`);
            }}>
              <Text style={styles.bigBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>

          {/* Chart */}
          {(sonoLog||[]).length > 1 && (() => {
            const ultimos = [...(sonoLog||[])].sort((a,b) => a.date > b.date ? 1 : -1).slice(-14);
            const maxH = Math.max(...ultimos.map(e => e.horas), 9);
            const chartH = 70;
            return (
              <View style={[styles.card, { marginBottom:12 }]}>
                <Text style={[styles.sectionTitle2, { marginBottom:12 }]}>📈 Últimos {ultimos.length} dias</Text>
                <View style={styles.barChart}>
                  {ultimos.map((e, i) => {
                    const pct = e.horas / maxH;
                    const cor = e.horas >= 7 ? C.accent : e.horas >= 6 ? C.orange : C.danger;
                    return (
                      <View key={e.id} style={styles.barWrap}>
                        <Text style={styles.barValue}>{e.horas}h</Text>
                        <View style={[styles.bar, { height: Math.max(pct * chartH, 4), backgroundColor: cor }]} />
                        <Text style={styles.barLabel}>{e.date.slice(8)}/{e.date.slice(5,7)}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={{ borderTopWidth:1, borderTopColor:C.border, paddingTop:10, marginTop:6 }}>
                  <Text style={[styles.muted, { textAlign:'center', fontSize:11 }]}>
                    Média: {(ultimos.reduce((s,e) => s+e.horas,0)/ultimos.length).toFixed(1)}h/noite · Recomendado: 7–9h
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* History list */}
          {(sonoLog||[]).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Registros Recentes</Text>
              {[...(sonoLog||[])].sort((a,b) => b.date > a.date ? 1 : -1).slice(0,7).map(e => (
                <View key={e.id} style={[styles.card, { marginBottom:8, flexDirection:'row', alignItems:'center', paddingVertical:12 }]}>
                  <View style={{ width:44, height:44, borderRadius:22, backgroundColor:
                    e.horas>=7 ? C.accent+'22' : e.horas>=6 ? C.orange+'22' : C.danger+'22',
                    alignItems:'center', justifyContent:'center', marginRight:12 }}>
                    <Text style={{ fontSize:20 }}>{'😩😔😐😊😴'[e.qualidade-1]}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ color:C.text, fontWeight:'700' }}>{e.horas}h dormidas</Text>
                    <Text style={{ color:C.muted, fontSize:11 }}>{e.date.split('-').reverse().join('/')}</Text>
                  </View>
                  <View style={{ alignItems:'flex-end' }}>
                    <Text style={{ color:C.muted, fontSize:11 }}>qualidade</Text>
                    <Text style={{ color:C.accent, fontWeight:'800', fontSize:16 }}>{e.qualidade}/5</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}

      {proTab === 'cardio' && (() => {
        const logs = cardioLog || [];
        const totalSessoes = logs.length;
        const totalKm      = logs.reduce((s, l) => s + (l.distKm || 0), 0);
        const totalMins    = logs.reduce((s, l) => s + (l.durSec  || 0), 0) / 60;
        const totalKcal    = logs.reduce((s, l) => s + (l.kcal    || 0), 0);

        const actCount = {};
        CARDIO_ACTIVITIES.forEach(a => { actCount[a.id] = logs.filter(l => l.actId === a.id).length; });
        const maxAct = Math.max(...Object.values(actCount), 1);

        const recent = [...logs].reverse().slice(0, 5);

        return (
          <>
            <Text style={styles.sectionTitle}>🏃 Resumo Cardio</Text>
            <View style={[styles.row, { flexWrap:'wrap' }]}>
              {[
                { label:'Sessões',    val:totalSessoes,                    unit:'' },
                { label:'Distância',  val:totalKm.toFixed(1),             unit:'km' },
                { label:'Tempo',      val:Math.round(totalMins),           unit:'min' },
                { label:'Kcal',       val:totalKcal,                       unit:'kcal' },
              ].map(s => (
                <View key={s.label} style={styles.cardioSumCard}>
                  <Text style={styles.cardioSumVal}>{s.val}<Text style={{ fontSize:11, color:C.muted }}>{s.unit ? ' '+s.unit : ''}</Text></Text>
                  <Text style={styles.cardioSumLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>📊 Por Atividade</Text>
            <View style={styles.card}>
              {CARDIO_ACTIVITIES.map(a => (
                <View key={a.id} style={{ marginBottom:10 }}>
                  <View style={[styles.row, { justifyContent:'space-between', marginBottom:4 }]}>
                    <Text style={{ color:C.text, fontWeight:'700' }}>{a.emoji} {a.label}</Text>
                    <Text style={{ color:C.accent, fontWeight:'700' }}>{actCount[a.id]} sessão{actCount[a.id]!==1?'es':''}</Text>
                  </View>
                  <View style={[styles.macroBarBg]}>
                    <View style={[styles.macroBarFill, { width:`${(actCount[a.id]/maxAct)*100}%`, backgroundColor:C.accent }]} />
                  </View>
                </View>
              ))}
              {totalSessoes === 0 && <Text style={[styles.muted, { textAlign:'center' }]}>Nenhuma sessão registrada ainda.</Text>}
            </View>

            <Text style={styles.sectionTitle}>🕐 Últimas Sessões</Text>
            {recent.length === 0 && <Text style={[styles.muted, { textAlign:'center', marginBottom:12 }]}>Nenhuma sessão ainda.</Text>}
            {recent.map((s, i) => {
              const act = CARDIO_ACTIVITIES.find(a => a.id === s.actId);
              const mins = Math.floor((s.durSec||0)/60);
              const secs = (s.durSec||0) % 60;
              return (
                <View key={i} style={[styles.card, { marginBottom:8, paddingVertical:10 }]}>
                  <View style={[styles.row, { justifyContent:'space-between' }]}>
                    <Text style={{ color:C.text, fontWeight:'700', fontSize:14 }}>{act?.emoji} {act?.label || s.actId}</Text>
                    <Text style={[styles.muted, { fontSize:11 }]}>{s.date ? new Date(s.date).toLocaleDateString('pt-BR') : ''}</Text>
                  </View>
                  <View style={[styles.row, { marginTop:6, gap:14 }]}>
                    <Text style={styles.muted}>⏱ {mins}m {secs}s</Text>
                    {s.distKm > 0 && <Text style={styles.muted}>📍 {s.distKm.toFixed(2)} km</Text>}
                    <Text style={styles.muted}>🔥 {s.kcal} kcal</Text>
                  </View>
                </View>
              );
            })}
          </>
        );
      })()}
      {/* ── Metas Personalizadas ── */}
      {proTab === 'metas' && (
        <>
          <Text style={styles.sectionTitle}>🎯 Metas Personalizadas</Text>
          {(metasCustom||[]).length === 0 ? (
            <View style={[styles.card, { alignItems:'center', paddingVertical:24 }]}>
              <Text style={{ color:C.muted, textAlign:'center', marginBottom:12 }}>Nenhuma meta definida ainda.</Text>
            </View>
          ) : (metasCustom||[]).map(meta => {
            const pct = Math.min(parseFloat(meta.progresso||0) / parseFloat(meta.meta||1), 1);
            const cor = pct >= 1 ? C.accent : pct >= 0.5 ? C.blue : C.orange;
            return (
              <View key={meta.id} style={[styles.card, { marginBottom:10 }]}>
                <View style={[styles.row, { justifyContent:'space-between', marginBottom:6 }]}>
                  <Text style={{ color:C.text, fontWeight:'800', flex:1 }}>{meta.titulo}</Text>
                  {pct >= 1 && <Text style={{ color:C.accent, fontSize:18 }}>🏆</Text>}
                  <TouchableOpacity onPress={() => setMetasCustom(p => (p||[]).filter(m => m.id!==meta.id))} style={{ marginLeft:8 }}>
                    <Ionicons name="trash-outline" size={14} color={C.danger} />
                  </TouchableOpacity>
                </View>
                <View style={{ height:8, backgroundColor:C.card2, borderRadius:4, marginBottom:6 }}>
                  <View style={{ height:8, width:`${pct*100}%`, backgroundColor:cor, borderRadius:4 }} />
                </View>
                <View style={[styles.row, { justifyContent:'space-between' }]}>
                  <Text style={{ color:C.muted, fontSize:12 }}>Progresso: {meta.progresso||0} / {meta.meta}</Text>
                  {meta.dataFim && <Text style={{ color:C.muted, fontSize:11 }}>até {meta.dataFim}</Text>}
                </View>
                <View style={[styles.row, { gap:8, marginTop:8 }]}>
                  <TouchableOpacity onPress={() => setMetasCustom(p => (p||[]).map(m => m.id===meta.id ? {...m, progresso:Math.max(0,(parseFloat(m.progresso)||0)-1)} : m))}
                    style={[styles.outlineBtn, { flex:1, paddingVertical:6 }]}>
                    <Text style={[styles.outlineBtnText, { fontSize:16 }]}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMetasCustom(p => (p||[]).map(m => m.id===meta.id ? {...m, progresso:Math.min(parseFloat(m.meta||1),(parseFloat(m.progresso)||0)+1)} : m))}
                    style={[styles.bigBtn, { flex:1, paddingVertical:6 }]}>
                    <Text style={[styles.bigBtnText, { fontSize:16 }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <TouchableOpacity style={[styles.bigBtn, { marginTop:8 }]} onPress={() => setShowMetaFormModal(true)}>
            <View style={styles.row}><Ionicons name="add-circle-outline" size={16} color={C.bg} style={{ marginRight:8 }} /><Text style={styles.bigBtnText}>Nova Meta</Text></View>
          </TouchableOpacity>

          <Modal visible={showMetaFormModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Nova Meta</Text>
                <Text style={[styles.setupLabel, { marginTop:14 }]}>Título da meta</Text>
                <TextInput style={styles.input} placeholder="Ex: 20 treinos no mês" placeholderTextColor={C.muted} value={metaFormTitulo} onChangeText={setMetaFormTitulo} />
                <Text style={[styles.setupLabel, { marginTop:10 }]}>Valor alvo</Text>
                <TextInput style={styles.input} placeholder="Ex: 20" placeholderTextColor={C.muted} value={metaFormMeta} onChangeText={setMetaFormMeta} keyboardType="numeric" />
                <Text style={[styles.setupLabel, { marginTop:10 }]}>Data fim (opcional)</Text>
                <TextInput style={styles.input} placeholder="AAAA-MM-DD" placeholderTextColor={C.muted} value={metaFormFim} onChangeText={setMetaFormFim} />
                <View style={[styles.row, { gap:10, marginTop:16 }]}>
                  <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={() => {
                    if (!metaFormTitulo.trim() || !metaFormMeta) { Alert.alert('Preencha todos os campos obrigatórios'); return; }
                    setMetasCustom(p => [...(p||[]), { id:Date.now().toString(), titulo:metaFormTitulo.trim(), meta:metaFormMeta, progresso:0, dataFim:metaFormFim.trim() }]);
                    setShowMetaFormModal(false); setMetaFormTitulo(''); setMetaFormMeta(''); setMetaFormFim('');
                  }}><Text style={styles.bigBtnText}>Salvar</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setShowMetaFormModal(false)}>
                    <Text style={styles.outlineBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* ── Histórico Completo ── */}
      {proTab === 'historico' && (
        <>
          <Text style={styles.sectionTitle}>📋 Histórico de Treinos</Text>
          {(sessionsHistory||[]).length === 0 ? (
            <View style={[styles.card, { alignItems:'center', paddingVertical:24 }]}>
              <Text style={{ color:C.muted }}>Nenhum treino registrado ainda.</Text>
            </View>
          ) : [...(sessionsHistory||[])].reverse().map((sessao, idx) => (
            <View key={idx} style={[styles.card, { marginBottom:12 }]}>
              <View style={[styles.row, { justifyContent:'space-between', marginBottom:8 }]}>
                <Text style={{ color:C.text, fontWeight:'800', fontSize:14 }}>
                  📅 {sessao.date || 'Data desconhecida'}
                </Text>
                <Text style={{ color:C.muted, fontSize:12 }}>
                  {Object.keys(sessao.exSets||{}).length} exercício(s)
                </Text>
              </View>
              {Object.entries(sessao.exSets||{}).slice(0, 5).map(([exIdx, sets]) => (
                <View key={exIdx} style={{ marginBottom:6, paddingLeft:8, borderLeftWidth:2, borderLeftColor:C.accent+'40' }}>
                  <Text style={{ color:C.text, fontWeight:'600', fontSize:13 }}>Exercício {parseInt(exIdx)+1}</Text>
                  {(sets||[]).slice(0,3).map((s, si) => (
                    <Text key={si} style={{ color:C.muted, fontSize:12 }}>
                      {s.peso ? `${s.peso}kg × ${s.reps} reps` : s.reps ? `${s.reps} reps` : '—'}
                    </Text>
                  ))}
                </View>
              ))}
              {Object.keys(sessao.exSets||{}).length > 5 && (
                <Text style={{ color:C.muted, fontSize:11, marginTop:4 }}>+ {Object.keys(sessao.exSets).length-5} mais...</Text>
              )}
            </View>
          ))}
        </>
      )}

      </Animated.View>
    </ScrollView>
  );
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────
function PerfilScreen({ user, onLogout, onUpdateUser, notificacoesAtivas, setNotificacoesAtivas, notifHora, setNotifHora, onExportData, onImportData, suplementos, setSuplementos, suplementoLog, setSuplementoLog, aguaLembrete, setAguaLembrete, lesoes, setLesoes, refeicaoLembretes, setRefeicaoLembretes }) {
  const { C, styles, isDark, toggleTheme, accentKey, changeAccent } = useTheme();
  const screenAnim = useScreenAnimation();
  const [editModal, setEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [showSupModal, setShowSupModal] = useState(false);
  const [supNome, setSupNome]   = useState('');
  const [supDose, setSupDose]   = useState('');
  const [supHora, setSupHora]   = useState('');
  const [supEmoji, setSupEmoji] = useState('💊');
  const todaySup = todayKey();
  const takenToday = suplementoLog?.[todaySup] || [];
  const [editNome, setEditNome]   = useState(user.nome);
  const [editPeso, setEditPeso]   = useState(user.peso);
  const [editObj, setEditObj]     = useState(user.objetivo);
  const [editNivel, setEditNivel] = useState(user.nivel);
  const [editHora, setEditHora]   = useState(notifHora);

  const openEdit = () => { setEditNome(user.nome); setEditPeso(user.peso); setEditObj(user.objetivo); setEditNivel(user.nivel); setEditModal(true); };
  const saveEdit = () => { if (!editNome.trim() || !isPositiveNum(editPeso)) return; onUpdateUser({ ...user, nome:editNome.trim(), peso:editPeso, objetivo:editObj, nivel:editNivel }); setEditModal(false); };

  const confirmLogout = () => Alert.alert('Sair da conta', 'Tem certeza? Seus dados serão apagados.', [{ text:'Cancelar', style:'cancel' }, { text:'Sair', style:'destructive', onPress:onLogout }]);

  const toggleNotif = async (val) => {
    if (val) {
      const ok = await agendarLembrete(notifHora);
      if (ok) setNotificacoesAtivas(true);
    } else {
      await cancelarLembretes();
      setNotificacoesAtivas(false);
    }
  };

  const salvarHora = async () => {
    const valid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(editHora);
    if (!valid) { Alert.alert('Formato inválido', 'Use o formato HH:MM, ex: 07:30'); return; }
    setNotifHora(editHora);
    if (notificacoesAtivas) await agendarLembrete(editHora);
    Alert.alert('Horário salvo!', `Lembrete às ${editHora}${notificacoesAtivas ? ' — reagendado.' : ''}`);
  };

  const toggleAguaLembrete = async (val) => {
    if (val) {
      await agendarAguaLembretes();
      setAguaLembrete(true);
    } else {
      await cancelarAguaLembretes();
      setAguaLembrete(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para escolher sua foto.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets?.[0]?.uri) onUpdateUser({ ...user, photoUri: result.assets[0].uri });
    } catch (e) { Alert.alert('Erro', 'Não foi possível acessar a galeria.'); }
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar sua foto.'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets?.[0]?.uri) onUpdateUser({ ...user, photoUri: result.assets[0].uri });
    } catch (e) { Alert.alert('Erro', 'Não foi possível acessar a câmera.'); }
  };

  const handlePickPhoto = () => Alert.alert('Foto de Perfil', 'Escolha uma opção', [
    { text: 'Galeria de Fotos', onPress: pickFromGallery },
    { text: 'Tirar Foto',       onPress: pickFromCamera  },
    { text: 'Cancelar',         style: 'cancel'          },
  ]);

  const items = [
    { icon:'person-outline',   label:'Nome',   val:user.nome         },
    { icon:'calendar-outline', label:'Idade',  val:`${user.idade} anos` },
    { icon:'resize-outline',   label:'Altura', val:`${user.altura} cm`  },
    { icon:'scale-outline',    label:'Peso',   val:`${user.peso} kg`    },
    { icon:'flag-outline',     label:'Objetivo', val:user.objetivo     },
    { icon:'barbell-outline',  label:'Nível',  val:user.nivel         },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom:24 }}>
      <Animated.View style={screenAnim}>
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickPhoto} activeOpacity={0.8}>
          <AvatarImg uri={user.photoUri} name={user.nome} size={84} fontSize={36} style={{ borderWidth:2.5 }} />
          <View style={styles.photoEditBadge}><Ionicons name="camera" size={13} color={C.bg} /></View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{user.nome}</Text>
        <View style={[styles.objetivoBadge, { borderColor:C.accent }]}>
          <Text style={[styles.objetivoText, { color:C.accent }]}>🎯 {user.objetivo}</Text>
        </View>
        <TouchableOpacity style={[styles.outlineBtn, { marginTop:14, paddingVertical:9, paddingHorizontal:24 }]} onPress={openEdit}>
          <View style={styles.row}><Ionicons name="create-outline" size={16} color={C.muted} style={{ marginRight:6 }} /><Text style={styles.outlineBtnText}>Editar Perfil</Text></View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Seus Dados</Text>
      {items.map((item,i) => (
        <View key={i} style={styles.profileRow}>
          <Ionicons name={item.icon} size={18} color={C.muted} style={{ marginRight:12 }} />
          <Text style={styles.profileRowLabel}>{item.label}</Text>
          <Text style={styles.profileRowVal}>{item.val}</Text>
        </View>
      ))}

      {/* IMC Card */}
      {(() => {
        const altM = parseFloat(user.altura) / 100;
        const pesoKg = parseFloat(user.peso);
        if (!altM || !pesoKg || altM <= 0 || pesoKg <= 0) return null;
        const imc = pesoKg / (altM * altM);
        const [catLabel, catColor] = imc < 18.5 ? ['Abaixo do Peso', C.blue]
          : imc < 25 ? ['Peso Normal', C.accent]
          : imc < 30 ? ['Sobrepeso', C.orange]
          : ['Obesidade', C.danger];
        return (
          <View style={[styles.card, { marginBottom:8, borderColor:catColor+'60', borderWidth:1.5 }]}>
            <View style={[styles.row, { justifyContent:'space-between', marginBottom:6 }]}>
              <Text style={[styles.sectionTitle2, { margin:0 }]}>📊 IMC</Text>
              <View style={{ backgroundColor:catColor+'25', borderRadius:10, paddingHorizontal:10, paddingVertical:3 }}>
                <Text style={{ color:catColor, fontSize:12, fontWeight:'800' }}>{catLabel}</Text>
              </View>
            </View>
            <Text style={{ color:catColor, fontSize:44, fontWeight:'900', textAlign:'center', marginVertical:4 }}>{imc.toFixed(1)}</Text>
            <Text style={[styles.muted, { textAlign:'center', fontSize:11 }]}>kg/m² · Referência normal: 18,5 – 24,9</Text>
          </View>
        );
      })()}

      <Text style={styles.sectionTitle}>⚙️ Configurações</Text>
      <View style={styles.card}>
        {/* Dark Mode */}
        <View style={[styles.settingRow]}>
          <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={18} color={C.muted} style={{ marginRight:12 }} />
          <Text style={styles.settingLabel}>{isDark ? 'Tema Escuro' : 'Tema Claro'}</Text>
          <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false:C.border, true:C.accent+'88' }} thumbColor={isDark ? C.accent : C.card2} />
        </View>

        {/* Cor de destaque */}
        <View style={[styles.settingRow, { borderTopWidth:1, borderTopColor:C.border, flexWrap:'wrap' }]}>
          <View style={[styles.row, { width:'100%', marginBottom:8 }]}>
            <Ionicons name="color-palette-outline" size={18} color={C.muted} style={{ marginRight:12 }} />
            <Text style={styles.settingLabel}>Cor de Destaque</Text>
          </View>
          <View style={[styles.row, { gap:12, flexWrap:'wrap', paddingLeft:30 }]}>
            {ACCENT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key} onPress={() => changeAccent(opt.key)}>
                <View style={[styles.colorDot, { backgroundColor: isDark ? opt.darkA : opt.lightA },
                  accentKey === opt.key && { borderWidth:3, borderColor: '#fff', transform:[{scale:1.2}] }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notificações */}
        <View style={[styles.settingRow, { borderTopWidth:1, borderTopColor:C.border, flexWrap:'wrap' }]}>
          <View style={[styles.row, { flex:1 }]}>
            <Ionicons name="notifications-outline" size={18} color={C.muted} style={{ marginRight:12 }} />
            <Text style={styles.settingLabel}>Lembrete de Treino</Text>
            <Switch value={notificacoesAtivas} onValueChange={toggleNotif} trackColor={{ false:C.border, true:C.accent+'88' }} thumbColor={notificacoesAtivas ? C.accent : C.card2} />
          </View>
          {notificacoesAtivas && (
            <View style={[styles.row, { width:'100%', marginTop:10, gap:10 }]}>
              <TextInput style={[styles.input, { flex:1, paddingVertical:10 }]} placeholder="07:30" placeholderTextColor={C.muted}
                value={editHora} onChangeText={setEditHora} keyboardType="numbers-and-punctuation" maxLength={5} />
              <TouchableOpacity style={[styles.timerBtn, { marginTop:0 }]} onPress={salvarHora}>
                <Text style={styles.timerBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Lembrete de Hidratação */}
        <View style={[styles.settingRow, { borderTopWidth:1, borderTopColor:C.border }]}>
          <Ionicons name="water-outline" size={18} color={C.muted} style={{ marginRight:12 }} />
          <Text style={[styles.settingLabel, { flex:1 }]}>Lembrete de Hidratação</Text>
          <Switch value={aguaLembrete||false} onValueChange={toggleAguaLembrete} trackColor={{ false:C.border, true:C.blue+'88' }} thumbColor={aguaLembrete ? C.blue : C.card2} />
        </View>
        {aguaLembrete && (
          <View style={{ paddingHorizontal:16, paddingBottom:10 }}>
            <Text style={[styles.muted, { fontSize:11 }]}>💧 Notificações às 8h, 10h, 12h, 14h, 16h, 18h e 20h</Text>
          </View>
        )}

        {/* Privacidade */}
        <TouchableOpacity style={[styles.settingRow, { borderTopWidth:1, borderTopColor:C.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={C.muted} style={{ marginRight:12 }} />
          <Text style={styles.settingLabel}>Privacidade</Text>
          <Ionicons name="chevron-forward" size={16} color={C.muted} />
        </TouchableOpacity>
      </View>

      {/* ── Suplementos ── */}
      <Text style={styles.sectionTitle}>💊 Suplementos</Text>
      <View style={[styles.card, { marginBottom:12 }]}>
        {(suplementos||[]).length === 0 ? (
          <Text style={[styles.muted, { textAlign:'center', paddingVertical:16 }]}>Nenhum suplemento cadastrado.</Text>
        ) : (suplementos||[]).map(sup => {
          const taken = takenToday.includes(sup.id);
          return (
            <View key={sup.id} style={[styles.row, { paddingVertical:10, borderBottomWidth:1, borderBottomColor:C.border, gap:10 }]}>
              <Text style={{ fontSize:22 }}>{sup.emoji||'💊'}</Text>
              <View style={{ flex:1 }}>
                <Text style={{ color:C.text, fontWeight:'700', fontSize:14 }}>{sup.nome}</Text>
                <Text style={{ color:C.muted, fontSize:11 }}>{sup.dose}{sup.horario ? ` · ${sup.horario}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setSuplementoLog(prev => {
                const cur = prev?.[todaySup] || [];
                return { ...prev, [todaySup]: taken ? cur.filter(id => id !== sup.id) : [...cur, sup.id] };
              })} style={{ width:34, height:34, borderRadius:17, borderWidth:2,
                borderColor: taken ? C.accent : C.border, backgroundColor: taken ? C.accent : 'transparent',
                alignItems:'center', justifyContent:'center' }}>
                {taken && <Ionicons name="checkmark" size={18} color={C.bg} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSuplementos(prev => (prev||[]).filter(s => s.id !== sup.id))}>
                <Ionicons name="trash-outline" size={18} color={C.danger} />
              </TouchableOpacity>
            </View>
          );
        })}
        <TouchableOpacity style={[styles.outlineBtn, { marginTop:10 }]} onPress={() => { setSupNome(''); setSupDose(''); setSupHora(''); setSupEmoji('💊'); setShowSupModal(true); }}>
          <View style={styles.row}><Ionicons name="add-circle-outline" size={16} color={C.muted} style={{ marginRight:6 }} /><Text style={styles.outlineBtnText}>Adicionar Suplemento</Text></View>
        </TouchableOpacity>
      </View>

      <Modal visible={showSupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight:'75%' }]}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ width:'100%' }}>
              <Text style={styles.modalTitle}>Novo Suplemento</Text>
              <Text style={[styles.setupLabel, { marginTop:12 }]}>Emoji</Text>
              <View style={[styles.row, { gap:8, flexWrap:'wrap', marginBottom:12 }]}>
                {['💊','🧴','🥤','⚡','🍵','🫙','💉','🌿'].map(e => (
                  <TouchableOpacity key={e} onPress={() => setSupEmoji(e)}
                    style={{ width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center',
                      backgroundColor: supEmoji===e ? C.accent+'22' : C.card2, borderWidth:1.5, borderColor: supEmoji===e ? C.accent : C.border }}>
                    <Text style={{ fontSize:22 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.setupLabel}>Nome</Text>
              <TextInput style={[styles.input, { marginBottom:10 }]} placeholder="Ex: Whey Protein" placeholderTextColor={C.muted} value={supNome} onChangeText={setSupNome} />
              <Text style={styles.setupLabel}>Dose / Quantidade</Text>
              <TextInput style={[styles.input, { marginBottom:10 }]} placeholder="Ex: 1 scoop (30g)" placeholderTextColor={C.muted} value={supDose} onChangeText={setSupDose} />
              <Text style={styles.setupLabel}>Horário (opcional)</Text>
              <TextInput style={[styles.input, { marginBottom:14 }]} placeholder="Ex: Pós-treino / 08:00" placeholderTextColor={C.muted} value={supHora} onChangeText={setSupHora} />
              <View style={[styles.row, { gap:10 }]}>
                <TouchableOpacity style={[styles.bigBtn, { flex:1 }]} onPress={() => {
                  if (!supNome.trim()) { Alert.alert('Atenção', 'Informe o nome do suplemento.'); return; }
                  const novo = { id: Date.now().toString(), nome: supNome.trim(), dose: supDose.trim(), horario: supHora.trim(), emoji: supEmoji };
                  setSuplementos(prev => [...(prev||[]), novo]);
                  setShowSupModal(false);
                }}><Text style={styles.bigBtnText}>Salvar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setShowSupModal(false)}>
                  <Text style={styles.outlineBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Controle de Lesões ── */}
      <Text style={styles.sectionTitle}>🩹 Controle de Lesões</Text>
      <View style={[styles.card, { marginBottom:12 }]}>
        {(lesoes||[]).length === 0 ? (
          <Text style={[styles.muted, { textAlign:'center', paddingVertical:12 }]}>Nenhuma lesão registrada.</Text>
        ) : (lesoes||[]).map(l => (
          <View key={l.id} style={[styles.row, { paddingVertical:10, borderBottomWidth:1, borderBottomColor:C.border }]}>
            <View style={{ flex:1 }}>
              <Text style={{ color:l.ativo ? C.danger : C.muted, fontWeight:'700' }}>{l.musculo}</Text>
              <Text style={{ color:C.muted, fontSize:11 }}>{l.descricao} · desde {l.dataInicio}</Text>
            </View>
            <TouchableOpacity onPress={() => setLesoes(prev => (prev||[]).map(x => x.id===l.id ? {...x, ativo:!x.ativo} : x))}
              style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:l.ativo?C.danger+'20':C.accent+'20' }}>
              <Text style={{ color:l.ativo?C.danger:C.accent, fontSize:12 }}>{l.ativo ? 'Recuperado' : 'Reativar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLesoes(prev => (prev||[]).filter(x => x.id!==l.id))} style={{ marginLeft:8 }}>
              <Ionicons name="trash-outline" size={16} color={C.danger} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={[styles.outlineBtn, { marginTop:10 }]} onPress={() => {
          Alert.prompt
            ? Alert.prompt('Nova Lesão','Área lesionada (ex: Ombro esquerdo)',(musculo) => {
                if (!musculo?.trim()) return;
                Alert.prompt('Descrição','Descreva brevemente a lesão',(desc) => {
                  setLesoes(prev => [...(prev||[]), { id:Date.now().toString(), musculo:musculo.trim(), descricao:desc||'', dataInicio:todayKey(), ativo:true }]);
                });
              })
            : Alert.alert('Nova Lesão','Use iOS para inserir detalhes, ou adicione através de uma versão futura.');
        }}>
          <View style={styles.row}>
            <Ionicons name="add-circle-outline" size={16} color={C.muted} style={{ marginRight:6 }} />
            <Text style={styles.outlineBtnText}>Registrar Lesão</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Lembretes de Refeição ── */}
      <Text style={styles.sectionTitle}>🍽️ Lembretes de Refeição</Text>
      <View style={[styles.card, { marginBottom:12 }]}>
        {(refeicaoLembretes||[]).length === 0 ? (
          <Text style={[styles.muted, { textAlign:'center', paddingVertical:12 }]}>Nenhum lembrete configurado.</Text>
        ) : (refeicaoLembretes||[]).map(r => (
          <View key={r.id} style={[styles.row, { paddingVertical:10, borderBottomWidth:1, borderBottomColor:C.border }]}>
            <View style={{ flex:1 }}>
              <Text style={{ color:C.text, fontWeight:'700' }}>{r.nome}</Text>
              <Text style={{ color:C.muted, fontSize:12 }}>{r.hora}</Text>
            </View>
            <Switch value={r.ativo} onValueChange={async (v) => {
              if (v) { await agendarRefeicaoLembrete(r.id, r.nome, r.hora); }
              else { await cancelarRefeicaoLembrete(r.id); }
              setRefeicaoLembretes(prev => (prev||[]).map(x => x.id===r.id ? {...x, ativo:v} : x));
            }} trackColor={{ false:C.border, true:C.accent+'88' }} thumbColor={r.ativo ? C.accent : C.card2} />
            <TouchableOpacity onPress={async () => {
              await cancelarRefeicaoLembrete(r.id);
              setRefeicaoLembretes(prev => (prev||[]).filter(x => x.id!==r.id));
            }} style={{ marginLeft:10 }}>
              <Ionicons name="trash-outline" size={16} color={C.danger} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={[styles.outlineBtn, { marginTop:10 }]} onPress={() => {
          Alert.prompt
            ? Alert.prompt('Nome da Refeição','Ex: Almoço, Lanche da tarde',(nome) => {
                if (!nome?.trim()) return;
                Alert.prompt('Horário','No formato HH:MM (ex: 12:30)',(hora) => {
                  if (!hora?.trim()) return;
                  const novoId = Date.now().toString();
                  const novo = { id:novoId, nome:nome.trim(), hora:hora.trim(), ativo:true };
                  setRefeicaoLembretes(prev => [...(prev||[]), novo]);
                  agendarRefeicaoLembrete(novoId, nome.trim(), hora.trim());
                });
              })
            : Alert.alert('Lembretes','Disponível apenas no iOS nesta versão. Em breve para Android!');
        }}>
          <View style={styles.row}>
            <Ionicons name="alarm-outline" size={16} color={C.muted} style={{ marginRight:6 }} />
            <Text style={styles.outlineBtnText}>Adicionar Lembrete</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>💾 Dados & Backup</Text>
      <View style={styles.card}>
        <TouchableOpacity style={[styles.settingRow]} onPress={onExportData}>
          <Ionicons name="cloud-upload-outline" size={18} color={C.muted} style={{ marginRight:12 }} />
          <View style={{ flex:1 }}>
            <Text style={styles.settingLabel}>Exportar Backup</Text>
            <Text style={[styles.muted, { fontSize:11, marginTop:1 }]}>Salve todos os seus dados como JSON</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingRow, { borderTopWidth:1, borderTopColor:C.border }]} onPress={() => { setImportInput(''); setShowImportModal(true); }}>
          <Ionicons name="cloud-download-outline" size={18} color={C.muted} style={{ marginRight:12 }} />
          <View style={{ flex:1 }}>
            <Text style={styles.settingLabel}>Restaurar Backup</Text>
            <Text style={[styles.muted, { fontSize:11, marginTop:1 }]}>Cole o JSON para restaurar seus dados</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.muted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.outlineBtn, { borderColor:C.danger, marginTop:8 }]} onPress={confirmLogout}>
        <View style={styles.row}><Ionicons name="log-out-outline" size={18} color={C.danger} style={{ marginRight:8 }} /><Text style={[styles.outlineBtnText, { color:C.danger }]}>Sair</Text></View>
      </TouchableOpacity>
      </Animated.View>

      <Modal visible={showImportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight:'80%' }]}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ width:'100%' }}>
              <Text style={styles.modalTitle}>Restaurar Backup</Text>
              <Text style={[styles.muted, { textAlign:'center', marginTop:4, marginBottom:14, fontSize:12 }]}>Cole o JSON do backup abaixo. Isso irá substituir todos os seus dados atuais.</Text>
              <TextInput
                style={[styles.input, { minHeight:120, textAlignVertical:'top', marginBottom:14 }]}
                placeholder='Cole o JSON aqui...'
                placeholderTextColor={C.muted}
                value={importInput}
                onChangeText={setImportInput}
                multiline
              />
              <View style={[styles.row, { gap:10 }]}>
                <TouchableOpacity style={[styles.bigBtn, { flex:1, backgroundColor:C.danger }]}
                  onPress={() => {
                    if (!importInput.trim()) return;
                    Alert.alert('Restaurar Dados', 'Isso irá substituir TODOS os seus dados. Tem certeza?', [
                      { text:'Cancelar', style:'cancel' },
                      { text:'Restaurar', style:'destructive', onPress: () => { onImportData(importInput.trim()); setShowImportModal(false); } },
                    ]);
                  }}>
                  <Text style={styles.bigBtnText}>Restaurar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setShowImportModal(false)}>
                  <Text style={styles.outlineBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight:'85%' }]}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ width:'100%' }}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>
              <Text style={[styles.setupLabel, { marginTop:16 }]}>Nome</Text>
              <TextInput style={styles.input} placeholder="Seu nome" placeholderTextColor={C.muted} value={editNome} onChangeText={setEditNome} />
              <Text style={[styles.setupLabel, { marginTop:12 }]}>Peso (kg)</Text>
              <TextInput style={styles.input} placeholder="Ex: 72" placeholderTextColor={C.muted} value={String(editPeso)} onChangeText={setEditPeso} keyboardType="numeric" />
              <Text style={[styles.setupLabel, { marginTop:12 }]}>Objetivo</Text>
              <View style={{ gap:6 }}>{OBJETIVOS.map(o => (<TouchableOpacity key={o} style={[styles.optionBtn, { padding:10, marginBottom:0 }, editObj===o && styles.optionBtnActive]} onPress={() => setEditObj(o)}><Text style={[styles.optionBtnText, { fontSize:13 }, editObj===o && styles.optionBtnTextActive]}>{o}</Text></TouchableOpacity>))}</View>
              <Text style={[styles.setupLabel, { marginTop:12 }]}>Nível</Text>
              <View style={{ flexDirection:'row', gap:6 }}>{NIVEIS.map(n => (<TouchableOpacity key={n} style={[styles.optionBtn, { flex:1, padding:10, marginBottom:0 }, editNivel===n && styles.optionBtnActive]} onPress={() => setEditNivel(n)}><Text style={[styles.optionBtnText, { fontSize:12 }, editNivel===n && styles.optionBtnTextActive]}>{n}</Text></TouchableOpacity>))}</View>
              <View style={[styles.row, { gap:10, marginTop:16 }]}>
                <TouchableOpacity style={[styles.bigBtn, { flex:1 }, (!editNome.trim()||!isPositiveNum(editPeso)) && { opacity:0.4 }]} disabled={!editNome.trim()||!isPositiveNum(editPeso)} onPress={saveEdit}><Text style={styles.bigBtnText}>Salvar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => setEditModal(false)}><Text style={styles.outlineBtnText}>Cancelar</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
function App() {
  const { C, styles } = useTheme();
  const [loaded, setLoaded]                       = useState(false);
  const [user, setUser]                           = useState(null);
  const [activeTab, setActiveTab]                 = useState('dashboard');
  const [treinoConcluido, setTreinoConcluido]     = useState(false);
  const [checkedMeals, setCheckedMeals]           = useState({});
  const [extraKcal, setExtraKcal]                 = useState(0);
  const [historico, setHistorico]                 = useState(null);
  const [exChecked, setExChecked]                 = useState({});
  const [exSets, setExSets]                       = useState({});
  const [medidas, setMedidas]                     = useState([]);
  const [treinosLog, setTreinosLog]               = useState([]);
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(false);
  const [notifHora, setNotifHora]                 = useState('07:00');
  const [aguaMl, setAguaMl]                       = useState(0);
  const [aguaServingMl, setAguaServingMl]         = useState(250);
  const [pesoMeta, setPesoMeta]                   = useState('');
  const [treinoNotas, setTreinoNotas]             = useState([]);
  const [treinosCustom, setTreinosCustom]         = useState([]);
  const [treinoAtivo, setTreinoAtivo]             = useState(null);
  const [caloriasLog, setCaloriasLog]             = useState([]);
  const [aguaGoalLog, setAguaGoalLog]             = useState([]);
  const [exSubst, setExSubst]                     = useState({});
  const [weekReportDismissed, setWeekReportDismissed] = useState(false);
  const [conquistas, setConquistas]               = useState([]);
  const [newConquista, setNewConquista]           = useState(null);
  const [sessionHistory, setSessionHistory]       = useState({});
  const [sessionsHistory, setSessionsHistory]     = useState([]);
  const [aguaLembrete, setAguaLembrete]           = useState(false);
  const [prHistory, setPrHistory]                 = useState({});
  const [rpeLog, setRpeLog]                       = useState([]);
  const [mesocicloStart, setMesocicloStart]       = useState(null);
  const [macroCiclo, setMacroCiclo]               = useState(false);
  const [cardioLog, setCardioLog]                 = useState([]);
  const [cardioWeekGoal, setCardioWeekGoal]       = useState(3);
  const [customFoods, setCustomFoods]             = useState(DEFAULT_FOODS);
  const [customFoodLog, setCustomFoodLog]         = useState([]);
  const [prRecords, setPrRecords]                 = useState({});
  const [plannerSemana, setPlannerSemana]         = useState({});
  const [suplementos, setSuplementos]             = useState([]);
  const [suplementoLog, setSuplementoLog]         = useState({});
  const [sonoLog, setSonoLog]                     = useState([]);
  const [jejumAtivo, setJejumAtivo]               = useState(false);
  const [jejumStart, setJejumStart]               = useState(null);
  const [jejumJanela, setJejumJanela]             = useState(16);
  const [jejumHistory, setJejumHistory]           = useState([]);
  const [domsLog, setDomsLog]                     = useState([]);
  const [metasCustom, setMetasCustom]             = useState([]);
  const [lesoes, setLesoes]                       = useState([]);
  const [refeicaoLembretes, setRefeicaoLembretes] = useState([]);
  const fadeAnim                                  = useRef(new Animated.Value(1)).current;

  const weekReport = useMemo(() => buildWeeklyReport(treinosLog, caloriasLog), [treinosLog, caloriasLog]);

  const caloriasIngeridas = user
    ? Object.entries(checkedMeals).filter(([,v]) => v).reduce((acc,[k]) => acc + (MEALS[user.objetivo]?.refeicoes[parseInt(k,10)]?.kcal || 0), 0) + extraKcal
    : 0;

  useEffect(() => {
    AsyncStorage.getItem('nutreino_data').then(raw => {
      if (raw) {
        try {
          const d = JSON.parse(raw);
          const today = todayKey();
          const isNewDay = d.lastActiveDate && d.lastActiveDate !== today;
          if (d.user)               setUser(d.user);
          setTreinoConcluido(isNewDay ? false : !!d.treinoConcluido);
          setCheckedMeals(isNewDay ? {} : (d.checkedMeals || {}));
          setExtraKcal(isNewDay ? 0 : (d.extraKcal || 0));
          setExChecked(isNewDay ? {} : (d.exChecked || {}));
          setExSets(isNewDay ? {} : (d.exSets || {}));
          setExSubst(isNewDay ? {} : (d.exSubst || {}));
          setWeekReportDismissed(isNewDay ? false : !!d.weekReportDismissed);
          if (d.historico)          setHistorico(d.historico);
          if (d.medidas)            setMedidas(d.medidas);
          if (d.treinosLog)         setTreinosLog(d.treinosLog);
          if (d.notificacoesAtivas) setNotificacoesAtivas(d.notificacoesAtivas);
          if (d.notifHora)          setNotifHora(d.notifHora);
          setAguaMl(isNewDay ? 0 : (d.aguaMl || 0));
          // Arquiva calorias do dia anterior
          const calLog = d.caloriasLog || [];
          if (isNewDay && d.caloriasHoje > 0 && d.lastActiveDate) calLog.push({ date:d.lastActiveDate, kcal:d.caloriasHoje });
          setCaloriasLog(calLog.slice(-30));
          if (d.aguaGoalLog)        setAguaGoalLog(d.aguaGoalLog);
          if (d.treinosCustom)      setTreinosCustom(d.treinosCustom);
          if (d.treinoAtivo !== undefined) setTreinoAtivo(d.treinoAtivo);
          if (d.aguaServingMl)      setAguaServingMl(d.aguaServingMl);
          if (d.pesoMeta)           setPesoMeta(d.pesoMeta);
          if (d.treinoNotas)        setTreinoNotas(d.treinoNotas);
          if (d.conquistas)         setConquistas(d.conquistas);
          if (d.sessionHistory)     setSessionHistory(d.sessionHistory);
          if (d.sessionsHistory)    setSessionsHistory(d.sessionsHistory);
          if (d.aguaLembrete)       setAguaLembrete(d.aguaLembrete);
          if (d.prHistory)          setPrHistory(d.prHistory);
          if (d.rpeLog)             setRpeLog(d.rpeLog);
          if (d.mesocicloStart)     setMesocicloStart(d.mesocicloStart);
          if (d.macroCiclo !== undefined) setMacroCiclo(d.macroCiclo);
          if (d.cardioLog)          setCardioLog(d.cardioLog);
          if (d.cardioWeekGoal)     setCardioWeekGoal(d.cardioWeekGoal);
          if (d.customFoods) { const uc=d.customFoods.filter(f=>f.cat==='Personalizado'); setCustomFoods([...DEFAULT_FOODS,...uc]); }
          if (d.customFoodLog)      setCustomFoodLog(d.customFoodLog);
          if (d.prRecords)          setPrRecords(d.prRecords);
          if (d.plannerSemana)      setPlannerSemana(d.plannerSemana);
          if (d.suplementos)        setSuplementos(d.suplementos);
          if (d.suplementoLog)      setSuplementoLog(d.suplementoLog);
          if (d.sonoLog)            setSonoLog(d.sonoLog);
          if (d.jejumAtivo !== undefined) setJejumAtivo(d.jejumAtivo);
          if (d.jejumStart)         setJejumStart(d.jejumStart);
          if (d.jejumJanela)        setJejumJanela(d.jejumJanela);
          if (d.jejumHistory)       setJejumHistory(d.jejumHistory);
          if (d.domsLog)            setDomsLog(d.domsLog);
          if (d.metasCustom)        setMetasCustom(d.metasCustom);
          if (d.lesoes)             setLesoes(d.lesoes);
          if (d.refeicaoLembretes)  setRefeicaoLembretes(d.refeicaoLembretes);
        } catch (e) {}
      }
    }).finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!user) { AsyncStorage.removeItem('nutreino_data').catch(() => {}); return; }
    AsyncStorage.setItem('nutreino_data', JSON.stringify({
      user, treinoConcluido, checkedMeals, extraKcal, historico, exChecked,
      exSets, medidas, treinosLog, notificacoesAtivas, notifHora,
      aguaMl, aguaServingMl, pesoMeta, treinoNotas,
      treinosCustom, treinoAtivo, caloriasLog, aguaGoalLog,
      exSubst, weekReportDismissed, conquistas, sessionHistory, sessionsHistory, cardioLog,
      cardioWeekGoal, customFoods, customFoodLog, prRecords,
      plannerSemana, suplementos, suplementoLog, sonoLog, aguaLembrete,
      prHistory, rpeLog, mesocicloStart, macroCiclo,
      jejumAtivo, jejumStart, jejumJanela, jejumHistory,
      domsLog, metasCustom, lesoes, refeicaoLembretes,
      caloriasHoje: caloriasIngeridas,
      lastActiveDate: todayKey(),
    })).catch(() => {});
  }, [loaded, user, treinoConcluido, checkedMeals, extraKcal, historico, exChecked, exSets, medidas, treinosLog, notificacoesAtivas, notifHora, aguaMl, aguaServingMl, pesoMeta, treinoNotas, exSubst, weekReportDismissed, conquistas, sessionHistory, sessionsHistory, cardioLog, cardioWeekGoal, customFoods, customFoodLog, prRecords, plannerSemana, suplementos, suplementoLog, sonoLog, aguaLembrete, prHistory, rpeLog, mesocicloStart, macroCiclo, jejumAtivo, jejumStart, jejumJanela, jejumHistory, domsLog, metasCustom, lesoes, refeicaoLembretes]);

  if (!loaded) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={[styles.header, { borderBottomWidth:1 }]}>
          <SkeletonCard height={18} style={{ width:120, marginBottom:0 }} />
          <SkeletonCard height={26} style={{ width:44, marginBottom:0, borderRadius:8 }} />
        </View>
        <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom:24 }}>
          <SkeletonCard height={72} />
          <View style={{ flexDirection:'row', gap:8 }}>
            <SkeletonCard height={90} style={{ flex:1 }} />
            <SkeletonCard height={90} style={{ flex:1 }} />
          </View>
          <SkeletonCard height={110} />
          <SkeletonCard height={60} />
          <SkeletonCard height={140} />
        </ScrollView>
      </View>
    );
  }

  const handleLogout = () => {
    setUser(null); setActiveTab('dashboard'); setTreinoConcluido(false);
    setCheckedMeals({}); setExtraKcal(0); setHistorico(null); setExChecked({});
    setExSets({}); setMedidas([]); setTreinosLog([]); setNotificacoesAtivas(false); setNotifHora('07:00');
    setAguaMl(0); setAguaServingMl(250); setPesoMeta(''); setTreinoNotas([]);
    setTreinosCustom([]); setTreinoAtivo(null); setCaloriasLog([]); setAguaGoalLog([]);
    setExSubst({}); setWeekReportDismissed(false); setConquistas([]); setSessionHistory({}); setSessionsHistory([]); setCardioLog([]);
    setCardioWeekGoal(3); setCustomFoods(DEFAULT_FOODS); setCustomFoodLog([]); setPrRecords({});
    setPlannerSemana({}); setSuplementos([]); setSuplementoLog({}); setSonoLog([]); setAguaLembrete(false);
    setPrHistory({}); setRpeLog([]); setMesocicloStart(null); setMacroCiclo(false);
    setJejumAtivo(false); setJejumStart(null); setJejumJanela(16); setJejumHistory([]);
    setDomsLog([]); setMetasCustom([]); setLesoes([]); setRefeicaoLembretes([]);
  };

  const handleUpdateUser = (newUser) => {
    if (newUser.objetivo !== user.objetivo) { setCheckedMeals({}); setExtraKcal(0); }
    setUser(newUser);
  };

  const handleBeberAgua = () => {
    const novo = aguaMl + aguaServingMl;
    setAguaMl(novo);
    if (user && novo >= calcMetaAgua(user)) {
      const today = todayKey();
      setAguaGoalLog(prev => prev.includes(today) ? prev : [...prev, today]);
    }
  };

  const handleAddCustomMl = (ml) => {
    if (!ml || ml <= 0) return;
    const novo = aguaMl + ml;
    setAguaMl(novo);
    if (user && novo >= calcMetaAgua(user)) {
      const today = todayKey();
      setAguaGoalLog(prev => prev.includes(today) ? prev : [...prev, today]);
    }
  };

  const handleTabSelect = (tab) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue:0, duration:100, useNativeDriver:true }),
      Animated.timing(fadeAnim, { toValue:1, duration:180, useNativeDriver:true }),
    ]).start();
    setActiveTab(tab);
  };

  const handleExportData = async () => {
    try {
      const raw = await AsyncStorage.getItem('nutreino_data');
      if (!raw) { Alert.alert('Sem dados', 'Nenhum dado para exportar ainda.'); return; }
      await Share.share({ message: raw, title: 'NuTreino Backup' });
    } catch (e) { Alert.alert('Erro', 'Não foi possível exportar os dados.'); }
  };

  const handleImportData = (jsonStr) => {
    try {
      const d = JSON.parse(jsonStr);
      if (!d.user) { Alert.alert('Arquivo inválido', 'O JSON não contém dados de usuário NuTreino.'); return; }
      if (d.user)               setUser(d.user);
      if (d.historico)          setHistorico(d.historico);
      if (d.medidas)            setMedidas(d.medidas);
      if (d.treinosLog)         setTreinosLog(d.treinosLog);
      if (d.notificacoesAtivas !== undefined) setNotificacoesAtivas(d.notificacoesAtivas);
      if (d.notifHora)          setNotifHora(d.notifHora);
      if (d.pesoMeta)           setPesoMeta(d.pesoMeta);
      if (d.treinoNotas)        setTreinoNotas(d.treinoNotas);
      if (d.treinosCustom)      setTreinosCustom(d.treinosCustom);
      if (d.caloriasLog)        setCaloriasLog(d.caloriasLog);
      if (d.aguaGoalLog)        setAguaGoalLog(d.aguaGoalLog);
      if (d.conquistas)         setConquistas(d.conquistas);
      if (d.sessionHistory)     setSessionHistory(d.sessionHistory);
      if (d.sessionsHistory)    setSessionsHistory(d.sessionsHistory);
      if (d.aguaLembrete)       setAguaLembrete(d.aguaLembrete);
      if (d.prHistory)          setPrHistory(d.prHistory);
      if (d.rpeLog)             setRpeLog(d.rpeLog);
      if (d.mesocicloStart)     setMesocicloStart(d.mesocicloStart);
      if (d.macroCiclo !== undefined) setMacroCiclo(d.macroCiclo);
      if (d.cardioLog)          setCardioLog(d.cardioLog);
      if (d.cardioWeekGoal)     setCardioWeekGoal(d.cardioWeekGoal);
      if (d.customFoods) { const uc=d.customFoods.filter(f=>f.cat==='Personalizado'); setCustomFoods([...DEFAULT_FOODS,...uc]); }
      if (d.customFoodLog)      setCustomFoodLog(d.customFoodLog);
      if (d.prRecords)          setPrRecords(d.prRecords);
      setCheckedMeals({}); setExtraKcal(0); setExChecked({}); setExSets({}); setExSubst({});
      setTreinoConcluido(false); setAguaMl(0); setActiveTab('dashboard');
      Alert.alert('✅ Backup restaurado!', 'Seus dados foram restaurados com sucesso.');
    } catch (e) { Alert.alert('Erro', 'JSON inválido. Verifique o arquivo de backup.'); }
  };

  const handleConcluir = (rpe) => {
    const today = todayKey();
    setTreinoConcluido(true);
    setSessionHistory(exSets);
    setSessionsHistory(prev => [...(prev||[]).slice(-9), { date: today, exSets }]);
    if (rpe) setRpeLog(prev => [...(prev||[]).filter(r => r.date !== today), { date: today, rpe }]);
    // Update PR records + history
    const activeWorkout = treinoAtivo
      ? treinosCustom.find(t => t.id === treinoAtivo)
      : WORKOUTS[user.objetivo]?.[user.nivel];
    if (activeWorkout?.exercises) {
      const newPrHistory = { ...prHistory };
      setPrRecords(prev => {
        const next = { ...prev };
        activeWorkout.exercises.forEach((ex, i) => {
          const exName = exSubst?.[i]?.n || ex.n;
          const sets = exSets[i] || [];
          sets.forEach(s => {
            const w = parseFloat(s.peso);
            if (w > 0 && (!next[exName] || w > next[exName].w)) {
              next[exName] = { w, reps: parseInt(s.reps, 10) || 0, date: today, name: exName };
              if (!newPrHistory[exName]) newPrHistory[exName] = [];
              const filtered = newPrHistory[exName].filter(h => h.date !== today);
              newPrHistory[exName] = [...filtered.slice(-19), { w, reps: parseInt(s.reps,10)||0, date: today }];
            }
          });
        });
        return next;
      });
      setPrHistory(newPrHistory);
    }
    setTreinosLog(prev => {
      const newLog = prev.includes(today) ? prev : [...prev, today];
      const streak = calcStreak(newLog);
      const maxSt  = calcMaxStreak(newLog);
      // Streak milestone vibration + alert
      if ([7, 30, 100].includes(streak)) {
        try { Vibration.vibrate([0,200,100,200,100,400]); } catch (_) {}
        setTimeout(() => {
          Alert.alert(
            streak === 7  ? '🔥 7 dias seguidos!' :
            streak === 30 ? '⚔️ Guerreiro do Mês!' : '💯 100 dias! Lendário!',
            `Você treinou ${streak} dias consecutivos. Isso é dedicação de verdade!`
          );
        }, 600);
      }
      // Check achievements
      const stats = {
        total: newLog.length,
        maxStreak: maxSt,
        aguaGoal: aguaGoalLog.length,
        weightGoalReached: pesoMeta && user ? Math.abs(parseFloat(user.peso) - parseFloat(pesoMeta)) < 0.5 : false,
        hasCustom: (treinosCustom||[]).length > 0,
      };
      setConquistas(cur => {
        const unlocked = checkNewAchievements(stats, cur);
        if (unlocked.length > 0) {
          setTimeout(() => setNewConquista(ACHIEVEMENTS.find(a => a.id === unlocked[0])), 800);
          return [...cur, ...unlocked];
        }
        return cur;
      });
      return newLog;
    });
  };

  const handleSaveNota = (nota) => {
    const workout = WORKOUTS[user.objetivo]?.[user.nivel];
    const d = new Date();
    setTreinoNotas(prev => [...prev, {
      id: Date.now().toString(),
      data: `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`,
      treino: workout?.name || user.objetivo,
      nota,
    }]);
  };

  if (!user) {
    return <SetupScreen onComplete={(userData) => { setUser(userData); setHistorico(buildHistorico(userData.peso)); }} />;
  }

  const hist = historico ?? buildHistorico(user.peso);

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} treinoConcluido={treinoConcluido} caloriasIngeridas={caloriasIngeridas} onNavigate={handleTabSelect} treinosLog={treinosLog} aguaMl={aguaMl} aguaServingMl={aguaServingMl} onBeberAgua={handleBeberAgua} onDesfazerAgua={() => setAguaMl(n => Math.max(n - aguaServingMl, 0))} onChangeServing={setAguaServingMl} onAddCustomMl={handleAddCustomMl} aguaGoalLog={aguaGoalLog} weekReport={weekReport} weekReportDismissed={weekReportDismissed} onDismissWeekReport={() => setWeekReportDismissed(true)} cardioLog={cardioLog} cardioWeekGoal={cardioWeekGoal} setCardioWeekGoal={setCardioWeekGoal} sonoLog={sonoLog} rpeLog={rpeLog} jejumAtivo={jejumAtivo} jejumStart={jejumStart} jejumJanela={jejumJanela} setJejumAtivo={setJejumAtivo} setJejumStart={setJejumStart} setJejumJanela={setJejumJanela} jejumHistory={jejumHistory} setJejumHistory={setJejumHistory} domsLog={domsLog} />;
      case 'treino':    return <TreinoScreen user={user} concluido={treinoConcluido} onConcluir={handleConcluir} exChecked={exChecked} setExChecked={setExChecked} exSets={exSets} setExSets={setExSets} onSaveNota={handleSaveNota} treinosCustom={treinosCustom} setTreinosCustom={setTreinosCustom} treinoAtivo={treinoAtivo} setTreinoAtivo={setTreinoAtivo} exSubst={exSubst} setExSubst={setExSubst} setHistory={sessionHistory} sessionsHistory={sessionsHistory} treinosLog={treinosLog} cardioLog={cardioLog} setCardioLog={setCardioLog} prRecords={prRecords} plannerSemana={plannerSemana} setPlannerSemana={setPlannerSemana} mesocicloStart={mesocicloStart} setMesocicloStart={setMesocicloStart} domsLog={domsLog} setDomsLog={setDomsLog} lesoes={lesoes} />;
      case 'dieta':     return <DietaScreen user={user} checkedMeals={checkedMeals} setCheckedMeals={setCheckedMeals} extraKcal={extraKcal} setExtraKcal={setExtraKcal} customFoods={customFoods} setCustomFoods={setCustomFoods} customFoodLog={customFoodLog} setCustomFoodLog={setCustomFoodLog} treinosLog={treinosLog} macroCiclo={macroCiclo} setMacroCiclo={setMacroCiclo} />;
      case 'progresso': return <ProgressoScreen user={user} historico={hist} setHistorico={setHistorico} medidas={medidas} setMedidas={setMedidas} treinosLog={treinosLog} pesoMeta={pesoMeta} setPesoMeta={setPesoMeta} treinoNotas={treinoNotas} caloriasLog={caloriasLog} conquistas={conquistas} cardioLog={cardioLog} prRecords={prRecords} sonoLog={sonoLog} setSonoLog={setSonoLog} customFoodLog={customFoodLog} aguaGoalLog={aguaGoalLog} prHistory={prHistory} rpeLog={rpeLog} plannerSemana={plannerSemana} metasCustom={metasCustom} setMetasCustom={setMetasCustom} sessionsHistory={sessionsHistory} />;
      case 'perfil':    return <PerfilScreen user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} notificacoesAtivas={notificacoesAtivas} setNotificacoesAtivas={setNotificacoesAtivas} notifHora={notifHora} setNotifHora={setNotifHora} onExportData={handleExportData} onImportData={handleImportData} suplementos={suplementos} setSuplementos={setSuplementos} suplementoLog={suplementoLog} setSuplementoLog={setSuplementoLog} aguaLembrete={aguaLembrete} setAguaLembrete={setAguaLembrete} lesoes={lesoes} setLesoes={setLesoes} refeicaoLembretes={refeicaoLembretes} setRefeicaoLembretes={setRefeicaoLembretes} />;
      default:          return <Dashboard user={user} treinoConcluido={treinoConcluido} caloriasIngeridas={caloriasIngeridas} onNavigate={handleTabSelect} treinosLog={treinosLog} aguaMl={aguaMl} aguaServingMl={aguaServingMl} onBeberAgua={handleBeberAgua} onDesfazerAgua={() => setAguaMl(n => Math.max(n - aguaServingMl, 0))} onChangeServing={setAguaServingMl} onAddCustomMl={handleAddCustomMl} aguaGoalLog={aguaGoalLog} weekReport={weekReport} weekReportDismissed={weekReportDismissed} onDismissWeekReport={() => setWeekReportDismissed(true)} sonoLog={sonoLog} rpeLog={rpeLog} jejumAtivo={jejumAtivo} jejumStart={jejumStart} jejumJanela={jejumJanela} setJejumAtivo={setJejumAtivo} setJejumStart={setJejumStart} setJejumJanela={setJejumJanela} jejumHistory={jejumHistory} setJejumHistory={setJejumHistory} domsLog={domsLog} />;
    }
  };

  const titles = { dashboard:'NuTreino', treino:'Meu Treino', dieta:'Plano Alimentar', progresso:'Meu Progresso', perfil:'Perfil' };

  return (
    <SafeAreaView style={styles.root} edges={['top','left','right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{titles[activeTab]}</Text>
          {activeTab === 'dashboard' && <Text style={styles.headerSub}>{getDataFormatada()}</Text>}
        </View>
        <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>PRO</Text></View>
      </View>
      <Animated.View style={[{ flex:1 }, { opacity:fadeAnim }]}>{renderScreen()}</Animated.View>
      <TabBar active={activeTab} onSelect={handleTabSelect} />
      {newConquista && <AchievementUnlockModal achievement={newConquista} onClose={() => setNewConquista(null)} />}
    </SafeAreaView>
  );
}

// ─── ROOT WITH THEME PROVIDER ─────────────────────────────────────────────────
export default function Root() {
  const [isDark, setIsDark]               = useState(true);
  const [accentKey, setAccentKey]         = useState('green');
  const [autenticado, setAutenticado]     = useState(false);
  const [bioDisponivel, setBioDisponivel] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('nutreino_theme').then(t => { if (t === 'light') setIsDark(false); });
    AsyncStorage.getItem('nutreino_accent').then(k => { if (k) setAccentKey(k); });
    AsyncStorage.getItem('nutreino_onboarding').then(v => setOnboardingDone(v === 'done'));
    configurarCanalAndroid();
    verificarBiometria();
  }, []);

  const handleOnboardingComplete = () => {
    AsyncStorage.setItem('nutreino_onboarding', 'done').catch(() => {});
    setOnboardingDone(true);
  };

  const verificarBiometria = async () => {
    try {
      const hasHW    = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHW && enrolled) { setBioDisponivel(true); autenticar(); }
      else setAutenticado(true);
    } catch { setAutenticado(true); }
  };

  const autenticar = async () => {
    try {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage:'Acesse o NuTreino 💪', cancelLabel:'Cancelar' });
      if (r.success) setAutenticado(true);
    } catch { setAutenticado(true); }
  };

  const toggleTheme = () => {
    setIsDark(d => {
      const next = !d;
      AsyncStorage.setItem('nutreino_theme', next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const changeAccent = (key) => {
    setAccentKey(key);
    AsyncStorage.setItem('nutreino_accent', key).catch(() => {});
  };

  const C      = buildTheme(isDark, accentKey);
  const styles = useMemo(() => makeStyles(C), [isDark, accentKey]);
  const value  = useMemo(() => ({ C, styles, isDark, toggleTheme, accentKey, changeAccent }), [isDark, accentKey]);

  if (onboardingDone === null) return null;

  return (
    <ThemeCtx.Provider value={value}>
      <SafeAreaProvider>
        {!onboardingDone
          ? <OnboardingScreen onComplete={handleOnboardingComplete} />
          : autenticado ? <App /> : <LockScreen onAutenticar={autenticar} />
        }
      </SafeAreaProvider>
    </ThemeCtx.Provider>
  );
}
