# Personal Leveling (Projeto Web Estático)

Projeto web estático (HTML, CSS, JS) sem backend. Persiste dados localmente via `localStorage` e pode ser inicializado com um `data/seed.json`.

## Como abrir

- Opção 1 (sem servidor): Abra `index.html` diretamente no navegador.
  - Observação: Por políticas de segurança do navegador, o carregamento de `data/seed.json` pode ser bloqueado quando aberto via `file://`. O app lida com isso e continua normalmente, apenas sem seed automático.
- Opção 2 (recomendado durante desenvolvimento): Servir via um servidor estático simples.
  - Exemplos:
    - Python (3.x): `python -m http.server 8080`
    - Node.js (npx): `npx serve .`
    - VS Code Live Server: Extensão "Live Server".

## Estrutura de pastas

```text
/ (raiz)
├─ index.html
├─ README.md
├─ DIRETRIZ_DE_CODIGO.md
├─ assets/
│  ├─ styles/
│  │  └─ main.css
│  └─ scripts/
│     └─ main.js
├─ data/
│  └─ seed.json
└─ docs/
   ├─ README.md
   └─ templates/
      └─ FEATURE_GUIDE.md
```

## Conceitos principais

- HTML/CSS/JS puros, sem bundlers.
- Banco local: `localStorage` com namespace da aplicação.
- Seed opcional em `data/seed.json` (aplicado só uma vez, se não houver dados existentes).
- Documentação por diretório e por feature mais complexa (ver `docs/`).

## PWA: como testar

- Servir via HTTP (recomendado): `npx serve -l 5500` na raiz e abrir `http://127.0.0.1:5500/`.
- Verificar Service Worker: DevTools → Application → Service Workers → deve aparecer `/sw.js` "activated".
- Instalar app: Chrome/Edge → ícone de instalar (ou menu → Install app).
- Offline: desligar a rede e recarregar a página; o app deve abrir a partir do cache (core assets).
- Arquivos relevantes: `manifest.json`, `sw.js`, registro em `assets/scripts/main.js`.
- Ícones esperados (adicione os PNGs nestes caminhos):
  - `assets/images/icons/icon-180.png` (180×180, apple-touch-icon)
  - `assets/images/icons/icon-192.png` (192×192, manifest)
  - `assets/images/icons/icon-512.png` (512×512, manifest)

## Deploy (Netlify)

- Site publicado: <https://personal-leveling-rpg.netlify.app>
- Requisitos: Netlify CLI autenticado na sua conta.

Comandos úteis:

```bash
# Verificar usuário/estado atual
npx --yes netlify-cli@latest status

# Criar e vincular um novo site (interativo) OU vincular existente
npx --yes netlify-cli@latest init
# ou
npx --yes netlify-cli@latest link

# Deploy de produção a partir da raiz (usa netlify.toml)
npx --yes netlify-cli@latest deploy --dir . --prod --message "Deploy"
```

Notas:

- O vínculo local do projeto com o site fica em `.netlify/state.json` (diretório `.netlify/` já está no `.gitignore`).
- A configuração do site (headers, publish dir, etc.) está em `netlify.toml`.

### Gerar ícones PNG do PWA

Você pode gerar os PNGs a partir de um SVG/PNG base (1024×1024 recomendado):

1. Exporte/prepare uma arte quadrada 1024×1024.
2. Gere versões nos tamanhos 180, 192 e 512 (ex.: Figma/Photoshop/Imagemagick).
3. Salve nos caminhos acima. Mantenha fundo sólido ou com bom contraste para splash.
4. Recarregue o app e verifique o manifesto na DevTools → Application.

Exemplo (Imagemagick):

```bash
magick input-1024.png -resize 180x180 assets/images/icons/icon-180.png
magick input-1024.png -resize 192x192 assets/images/icons/icon-192.png
magick input-1024.png -resize 512x512 assets/images/icons/icon-512.png
```

## Autenticação (client-only)

- Implementação: sem backend; usuários e sessão salvos em `localStorage` (`app:users`, `app:session`).
- Fluxo: `index.html` contém abas Entrar/Cadastrar; após sucesso redireciona para `app.html`.
- Proteção de rota: `app.html` chama `App.auth.requireAuth()` (em `assets/scripts/auth.js`).
- Segurança: não use senhas reais. Senha é hasheada (SHA-256) no navegador, mas os dados ficam no dispositivo. Não há recuperação de senha.
- Logout: botão no header da aplicação (parcial `assets/components/header.html`).
- i18n (tela de auth): botão `#authLanguageToggle` alterna PT/EN; preferência persiste em `state.prefs.language` (namespace do app).
- Detalhes: ver `docs/features/auth.md`.

## i18n e preferências

- Idiomas: `pt-BR` (padrão) e `en`.
- Toggle: botão no header `#languageToggle` (ver `assets/components/header.html`).
- Persistência: preferência salva em `state.prefs.language` via `App.db` (LocalStorage).
- Aplicação: textos dinâmicos (streak, missões, botões) via dicionário i18n em `assets/scripts/main.js`.
- Dica: ao alternar o idioma, a UI é re-renderizada automaticamente.

## Ícones de UI (Material Symbols)

- Biblioteca: Material Symbols Outlined (Google Fonts) já importada em `index.html`.
- Uso: adicione `<span class="material-symbols-outlined">menu</span>` dentro do botão/label.
- Estilos: sizing base definido em `assets/styles/components/buttons.css`.
- Acessibilidade: mantenha `aria-label`/`title` informativos; não dependa só do ícone.

## Rebalance dinâmico (addPercent)

- Quando um preset inclui uma opção de pontuação com `rebalance`, o formulário de atividade exibe um campo numérico `Rebalance: adicionar ao alvo (%)`.
- Você define o percentual a ser adicionado ao atributo alvo (0–100), que é aplicado no cálculo de pesos antes de registrar a atividade.
- O valor respeita o limite `maxPercent` do preset (quando definido). A interface faz clamp automático e validações inline.
- Se o campo ficar vazio/for inválido, o app usa o `addPercent` do preset; se não existir, usa 10% (0.10).
- Quando não há `rebalance` na opção escolhida, o campo não aparece e os pesos base da categoria (`CATEGORY_MAP`) são usados.

## Próximos passos

- Ajustar os dados de `data/seed.json` conforme sua necessidade.
- Criar features seguindo o guia em `docs/templates/FEATURE_GUIDE.md`.
- Manter comentários claros no código e documentação atualizada.
