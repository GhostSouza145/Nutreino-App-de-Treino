<h1 align="center">
  <img src="https://img.shields.io/badge/NuTreino-App%20Fitness-00E5A0?style=for-the-badge&logo=react&logoColor=white" />
</h1>

<p align="center">
  <strong>Aplicativo completo de treino e nutrição desenvolvido em React Native + Expo</strong><br/>
  Planejamento de treinos · Dieta inteligente · Progresso detalhado · Tudo 100% offline
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/Plataforma-Android%20%7C%20iOS-green" />
  <img src="https://img.shields.io/badge/Armazenamento-100%25%20Local-orange" />
</p>

---

## Screenshots

<img width="378" height="798" alt="dashboard" src="https://github.com/user-attachments/assets/2457cd11-7b33-43d9-abb0-c375c5c9f916" />

<img width="375" height="802" alt="dieta" src="https://github.com/user-attachments/assets/44c365e9-99a9-4ab1-89a5-960e21c51fc4" />

 <img width="377" height="800" alt="progresso" src="https://github.com/user-attachments/assets/ba9e1266-cf9c-4f53-8dde-68a12ac35e1a" />

<img width="374" height="797" alt="treino" src="https://github.com/user-attachments/assets/aa851734-0585-4b38-aef1-edbf7570548d" />

---

## Funcionalidades

### Dashboard
- **Score de Prontidão do Dia** — avalia sono, hidratação e recuperação para indicar se você está pronto para treinar
- **Meta de Cárdio Semanal** — acompanhe suas sessões de cardio ao longo da semana
- **Jejum Intermitente** — timer em tempo real com fases (Digestão → Queima de Glicogênio → Queima de Gordura → Cetose), janelas 16:8, 18:6, 20:4
- **Tracker de Hidratação** — registro de copos d'água com meta diária personalizada
- **Dica do Dia** — dicas rotativas de treino, nutrição e recuperação
- **Resumo Rápido** — calorias consumidas, peso atual, streak de treinos e botões de acesso rápido

### Treino
- **Planos inteligentes** — treinos gerados automaticamente por objetivo (Emagrecimento, Ganho de Massa, Resistência) e nível (Iniciante, Intermediário, Avançado)
- **Timer de treino** — cronômetro com início/pausa integrado
- **Planejador Semanal** — defina o grupo muscular de cada dia da semana
- **Periodização por Mesociclo** — acompanhe o ciclo de treino (Acumulação → Intensificação → Pico → Deload)
- **PRs (Records Pessoais)** — registro automático de melhores cargas por exercício com histórico
- **Cardio & HIIT** — timer HIIT configurável + registro de sessões de cardio
- **Gerador de Treino** — gere treinos customizados por grupo muscular, equipamento disponível e tempo
- **Substituição de Exercício** — troque qualquer exercício por uma alternativa
- **DOMS Tracker** — avalie a dor muscular pós-treino por grupo (1–5)
- **Controle de Lesões** — registre lesões ativas com alerta visual no treino
- **Celebração animada** — confetes ao concluir o treino 🎉
- **Sugestão de Carga Progressiva** — baseada no RPE (escala 1–10) da sessão anterior

### Dieta
- **Banco de dados com 600+ alimentos** — baseado na TACO (Tabela Brasileira de Composição de Alimentos), cobrindo carnes, peixes, laticínios, cereais, frutas tropicais, pratos regionais, suplementos e muito mais
- **Plano alimentar personalizado** — 6 refeições do dia com calorias, macros e dicas
- **Macro Cycling** — ciclos automáticos de alto/moderado/baixo carboidrato
- **Registro de alimentos** — busca por nome, filtro por categoria, cálculo automático de macros por grama
- **Alimentos personalizados** — crie seus próprios alimentos com valores nutricionais
- **25 Receitas Fitness** — receitas com ingredientes e modo de preparo categorizados
- **Histórico de dieta** — log completo de tudo que foi consumido
- **Suplementos** — controle de uso diário com lembretes

### Progresso
- **Gráfico de peso** — evolução com linha de tendência
- **Medidas corporais** — peito, cintura, quadril, braço, coxa, panturrilha
- **Calculadoras** — IMC, TMB (Harris-Benedict), % de gordura corporal (método Navy)
- **Stats completos** — calorias consumidas, treinos realizados, volume total levantado
- **Cardio tracking** — distância, tempo e sessões ao longo do tempo
- **PRs (Recordes)** — histórico visual de evolução de carga por exercício
- **Diário de Sono** — registro de horas e qualidade de sono com gráfico
- **Metas Personalizadas** — crie e acompanhe metas próprias (peso, cardio, dieta…)
- **Histórico Completo** — todas as sessões de treino com detalhes

### Perfil & Configurações
- **Perfil completo** — nome, peso, altura, objetivo, nível, foto
- **Temas** — modo escuro/claro + 6 cores de destaque (Verde, Azul, Roxo, Laranja, Rosa, Ciano)
- **Notificações** — lembretes de treino diário + lembretes de refeição configuráveis por horário
- **Lembrete de hidratação** — notificações periódicas para beber água
- **Exportar/Importar dados** — backup completo em JSON
- **Controle de Lesões** — gerenciamento de lesões ativas
- **Conquistas** — sistema de badges por metas alcançadas

---

## Tecnologias

| Tecnologia | Uso |
|---|---|
| React Native 0.81.5 | Framework mobile |
| Expo SDK 54 | Build, APIs nativas |
| AsyncStorage | Persistência local (100% offline) |
| expo-notifications | Lembretes e notificações push |
| Animated API | Animações (confetti, transições) |
| @expo/vector-icons | Ícones (Ionicons) |
| react-native-safe-area-context | Suporte a notch/barra de status |

---

## Como rodar

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/nutreino.git
cd nutreino/projeto-faculdade

# Instale as dependências
npm install

# Inicie o Expo
npx expo start
```

Escaneie o QR Code com o app **Expo Go** no celular, ou rode no emulador Android/iOS.

## Gerar APK (Android)

```bash
# Instale o EAS CLI
npm install -g eas-cli

# Login na conta Expo
eas login

# Configure o projeto (primeira vez)
eas build:configure

# Gere o APK
eas build -p android --profile preview
```

---

## Estrutura do Projeto

```
projeto-faculdade/
├── App.js              # Código-fonte completo (single-file architecture)
├── screenshots/        # Screenshots do app
├── app.json            # Configuração do Expo
├── package.json        # Dependências
└── eas.json            # Configuração do EAS Build
```

---

## Banco de Dados de Alimentos

O app inclui **602 alimentos** cadastrados localmente, sem necessidade de API externa, organizados nas categorias:

- 🥩 **Proteínas** — carnes bovinas (18 cortes), frango, peixe, frutos do mar, ovos, leguminosas
- 🍚 **Carboidratos** — arroz, pães, massas, cereais, farinhas, tubérculos
- 🥦 **Vegetais** — folhas, legumes, temperos, condimentos
- 🍌 **Frutas** — frutas brasileiras tropicais e convencionais, frutas secas/desidratadas
- 🧀 **Laticínios** — queijos, iogurtes, leites, cremes, sorvetes
- 🍽️ **Pratos** — pratos regionais brasileiros, fast food, sopas, tortas
- 🍫 **Doces** — sobremesas, bebidas, molhos, condimentos
- 💊 **Suplementos** — whey, creatina, BCAA, vitaminas, pré-treinos

Valores nutricionais baseados na **TACO — Tabela Brasileira de Composição de Alimentos (UNICAMP)**.

---

## Licença

Projeto desenvolvido para fins acadêmicos.
