# Estudo de contraste — TocaPlay

Razões de contraste WCAG 2.1 dos dois temas. Limiares: **texto normal ≥ 4,5**; **texto grande/negrito, ícones e componentes de UI ≥ 3,0**. Gerado por `scripts/contrast-audit.mjs`.

## Tema escuro

### Texto sobre superfícies (mín. 4.5)
- ink (texto) sobre fundo (night-950): **17.24** ✅
- ink (texto) sobre painel (night-850): **15.46** ✅
- ink (texto) sobre hover (night-800): **14.32** ✅
- ink (texto) sobre sidebar (night-900): **16.34** ✅
- muted (secundário) sobre fundo (night-950): **10.65** ✅
- muted (secundário) sobre painel (night-850): **9.55** ✅
- muted (secundário) sobre hover (night-800): **8.85** ✅
- muted (secundário) sobre sidebar (night-900): **10.09** ✅

### Accent como texto (mín. 3.0; ideal 4.5) — sobre painel e fundo
- orange sobre painel (night-850): **6.47** ✅
- orange sobre fundo (night-950): **7.22** ✅
- grass sobre painel (night-850): **5.88** ✅
- grass sobre fundo (night-950): **6.56** ✅
- gold sobre painel (night-850): **10.36** ✅
- gold sobre fundo (night-950): **11.56** ✅
- diamond sobre painel (night-850): **7.9** ✅
- diamond sobre fundo (night-950): **8.81** ✅
- terra sobre painel (night-850): **5.62** ✅
- terra sobre fundo (night-950): **6.27** ✅
- amber sobre painel (night-850): **7.1** ✅
- amber sobre fundo (night-950): **7.92** ✅
- redstone sobre painel (night-850): **4.2** ✅ (ok p/ grande/ícone)
- redstone sobre fundo (night-950): **4.68** ✅

### Bordas sobre painel (desejável 3.0)
- night-700: **1.41** ◽ (borda sutil)
- night-600: **1.93** ◽ (borda sutil)

## Tema claro

### Texto sobre superfícies (mín. 4.5)
- ink (texto) sobre fundo (night-950): **15.91** ✅
- ink (texto) sobre painel (night-850): **17.66** ✅
- ink (texto) sobre hover (night-800): **14.82** ✅
- ink (texto) sobre sidebar (night-900): **16.84** ✅
- muted (secundário) sobre fundo (night-950): **6.57** ✅
- muted (secundário) sobre painel (night-850): **7.28** ✅
- muted (secundário) sobre hover (night-800): **6.11** ✅
- muted (secundário) sobre sidebar (night-900): **6.95** ✅

### Accent como texto (mín. 3.0; ideal 4.5) — sobre painel e fundo
- orange sobre painel (night-850): **4.94** ✅
- orange sobre fundo (night-950): **4.46** ✅ (ok p/ grande/ícone)
- grass sobre painel (night-850): **5.22** ✅
- grass sobre fundo (night-950): **4.7** ✅
- gold sobre painel (night-850): **5.37** ✅
- gold sobre fundo (night-950): **4.84** ✅
- diamond sobre painel (night-850): **5.17** ✅
- diamond sobre fundo (night-950): **4.66** ✅
- terra sobre painel (night-850): **5.96** ✅
- terra sobre fundo (night-950): **5.37** ✅
- amber sobre painel (night-850): **5.91** ✅
- amber sobre fundo (night-950): **5.33** ✅
- redstone sobre painel (night-850): **5.44** ✅
- redstone sobre fundo (night-950): **4.9** ✅

### Bordas sobre painel (desejável 3.0)
- night-700: **1.48** ◽ (borda sutil)
- night-600: **1.86** ◽ (borda sutil)

## Preenchimentos (botões/chips) — texto embutido sobre a cor (mín. 4.5)

- botão grass (#10240a sobre #5aa83c): **5.55** ✅
- botão terra (#2a1206 sobre #db7846): **5.71** ✅
- botão gold (#2a2005 sobre #f0c246): **9.57** ✅
- botão amber (#2a1705 sobre #e2952f): **7.01** ✅
- botão danger (#1a0503 sobre #db4a40): **4.75** ✅
- chip grass (#0c1f07 sobre #5aa83c): **5.85** ✅
- chip terra (#2a1206 sobre #db7846): **5.71** ✅
- chip gold (#2a2005 sobre #f0c246): **9.57** ✅
- chip orange (#2a1505 sobre #f0801f): **6.47** ✅
- chip diamond (#04201e sobre #37c2b4): **7.75** ✅****
- chip danger (#1a0503 sobre #db4a40): **4.75** ✅
- chip night (#f6f1e8 sobre #392c60): **10.96** ✅

---
TODOS OS PARES PASSARAM ✅
