/**
 * Dibujos de los avatares de la cuenta (SVG de 96x96, propios del sitio).
 * Generados una vez a partir de los bocetos; se dibujan en un circulo
 * (UserAvatar recorta con border-radius). Los ids son los que acepta el
 * servidor (AccountService.AVATARS).
 */

// prettier-ignore
export const AVATAR_ART = [
  {
    "id": "obelisco",
    "name": "Obelisco",
    "group": "Buenos Aires",
    "bg": "#8fd0f0",
    "art": "<rect y=\"74\" width=\"96\" height=\"22\" fill=\"#5aa469\"/><polygon points=\"44,74 52,74 50.5,26 48,18 45.5,26\" fill=\"#fafafa\" stroke=\"#c9c9c9\" stroke-width=\"1\"/><rect x=\"45\" y=\"44\" width=\"6\" height=\"3\" fill=\"#2b2b2b\"/><circle cx=\"74\" cy=\"22\" r=\"8\" fill=\"#ffd34d\"/>"
  },
  {
    "id": "mate",
    "name": "Mate",
    "group": "Buenos Aires",
    "bg": "#f4c11b",
    "art": "<path d=\"M30 46 Q30 80 48 82 Q66 80 66 46 Z\" fill=\"#8a5a2b\"/><rect x=\"28\" y=\"40\" width=\"40\" height=\"8\" rx=\"4\" fill=\"#c9a24a\"/><ellipse cx=\"48\" cy=\"44\" rx=\"16\" ry=\"4\" fill=\"#4c7a2a\"/><rect x=\"55\" y=\"16\" width=\"4\" height=\"30\" rx=\"2\" transform=\"rotate(18 57 30)\" fill=\"#c9c9c9\"/><path d=\"M36 60 q12 6 24 0\" stroke=\"#c9a24a\" stroke-width=\"2.5\" fill=\"none\"/>"
  },
  {
    "id": "farol",
    "name": "Farol",
    "group": "Buenos Aires",
    "bg": "#1f2a44",
    "art": "<circle cx=\"70\" cy=\"22\" r=\"6\" fill=\"#f2f2dc\"/><rect x=\"46\" y=\"44\" width=\"4\" height=\"52\" fill=\"#2b2b2b\"/><path d=\"M38 30 L58 30 L54 46 L42 46 Z\" fill=\"#ffd34d\" stroke=\"#2b2b2b\" stroke-width=\"3\"/><path d=\"M36 30 L60 30 L48 20 Z\" fill=\"#2b2b2b\"/><circle cx=\"48\" cy=\"38\" r=\"12\" fill=\"#ffd34d\" opacity=\".25\"/>"
  },
  {
    "id": "bandoneon",
    "name": "Bandoneón",
    "group": "Buenos Aires",
    "bg": "#c0392b",
    "art": "<rect x=\"18\" y=\"34\" width=\"14\" height=\"32\" rx=\"3\" fill=\"#1b1b1b\"/><rect x=\"64\" y=\"34\" width=\"14\" height=\"32\" rx=\"3\" fill=\"#1b1b1b\"/><path d=\"M32 36 L64 36 L64 64 L32 64 Z\" fill=\"#f5efe0\"/><path d=\"M36 36 v28 M40 36 v28 M44 36 v28 M48 36 v28 M52 36 v28 M56 36 v28 M60 36 v28\" stroke=\"#c9b98f\" stroke-width=\"2\"/><circle cx=\"25\" cy=\"44\" r=\"2\" fill=\"#e8e8e8\"/><circle cx=\"25\" cy=\"52\" r=\"2\" fill=\"#e8e8e8\"/><circle cx=\"71\" cy=\"44\" r=\"2\" fill=\"#e8e8e8\"/><circle cx=\"71\" cy=\"52\" r=\"2\" fill=\"#e8e8e8\"/>"
  },
  {
    "id": "jacaranda",
    "name": "Jacarandá",
    "group": "Buenos Aires",
    "bg": "#bfe3f5",
    "art": "<rect y=\"80\" width=\"96\" height=\"16\" fill=\"#7cb342\"/><rect x=\"45\" y=\"52\" width=\"6\" height=\"30\" fill=\"#6d4c41\"/><circle cx=\"36\" cy=\"44\" r=\"16\" fill=\"#8e6fd1\"/><circle cx=\"58\" cy=\"40\" r=\"18\" fill=\"#a084e8\"/><circle cx=\"48\" cy=\"30\" r=\"14\" fill=\"#9575cd\"/><circle cx=\"30\" cy=\"84\" r=\"2\" fill=\"#a084e8\"/><circle cx=\"64\" cy=\"86\" r=\"2\" fill=\"#a084e8\"/>"
  },
  {
    "id": "puente",
    "name": "Puente de la Mujer",
    "group": "Buenos Aires",
    "bg": "#2e86c1",
    "art": "<rect y=\"62\" width=\"96\" height=\"34\" fill=\"#1a5276\"/><path d=\"M8 62 L88 58\" stroke=\"#fafafa\" stroke-width=\"4\"/><path d=\"M34 60 L52 20\" stroke=\"#fafafa\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M52 20 L18 61 M52 20 L26 61 M52 20 L60 59 M52 20 L70 59 M52 20 L80 58\" stroke=\"#fafafa\" stroke-width=\"1.4\"/>"
  },
  {
    "id": "sol-de-mayo",
    "name": "Sol de Mayo",
    "group": "Buenos Aires",
    "bg": "#74acdf",
    "art": "<g fill=\"#f6b40e\"><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(0 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(30 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(60 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(90 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(120 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(150 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(180 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(210 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(240 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(270 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(300 48 48)\"/><polygon points=\"48,10 51,30 45,30\" transform=\"rotate(330 48 48)\"/></g><circle cx=\"48\" cy=\"48\" r=\"16\" fill=\"#f6b40e\" stroke=\"#85340a\" stroke-width=\"2\"/><circle cx=\"42\" cy=\"45\" r=\"2\" fill=\"#85340a\"/><circle cx=\"54\" cy=\"45\" r=\"2\" fill=\"#85340a\"/><path d=\"M41 54 q7 5 14 0\" stroke=\"#85340a\" stroke-width=\"2\" fill=\"none\"/>"
  },
  {
    "id": "fileteado",
    "name": "Fileteado",
    "group": "Buenos Aires",
    "bg": "#17171a",
    "art": "<path d=\"M20 70 C20 40 48 30 48 50 C48 62 34 60 36 52\" stroke=\"#f4c11b\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M76 70 C76 40 48 30 48 50\" stroke=\"#e74c3c\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M60 52 C60 60 70 60 66 52\" stroke=\"#3fa9f5\" stroke-width=\"3\" fill=\"none\"/><circle cx=\"48\" cy=\"28\" r=\"6\" fill=\"#f4c11b\"/><path d=\"M14 80 H82\" stroke=\"#f4c11b\" stroke-width=\"3\"/><circle cx=\"24\" cy=\"80\" r=\"3\" fill=\"#e74c3c\"/><circle cx=\"72\" cy=\"80\" r=\"3\" fill=\"#3fa9f5\"/>"
  },
  {
    "id": "carpincho",
    "name": "Carpincho",
    "group": "Fauna argentina",
    "bg": "#a3d9a5",
    "art": "<rect x=\"22\" y=\"26\" width=\"52\" height=\"56\" rx=\"24\" fill=\"#a0703f\"/><ellipse cx=\"30\" cy=\"28\" rx=\"7\" ry=\"6\" fill=\"#7b5230\"/><ellipse cx=\"66\" cy=\"28\" rx=\"7\" ry=\"6\" fill=\"#7b5230\"/><rect x=\"30\" y=\"56\" width=\"36\" height=\"22\" rx=\"11\" fill=\"#7b5230\"/><ellipse cx=\"42\" cy=\"64\" rx=\"3\" ry=\"2\" fill=\"#2b1b10\"/><ellipse cx=\"54\" cy=\"64\" rx=\"3\" ry=\"2\" fill=\"#2b1b10\"/><circle cx=\"37\" cy=\"46\" r=\"4\" fill=\"#1b1b1b\"/><circle cx=\"59\" cy=\"46\" r=\"4\" fill=\"#1b1b1b\"/><circle cx=\"38.3\" cy=\"44.7\" r=\"1.2\" fill=\"#fff\"/><circle cx=\"60.3\" cy=\"44.7\" r=\"1.2\" fill=\"#fff\"/>"
  },
  {
    "id": "hornero",
    "name": "Hornero",
    "group": "Fauna argentina",
    "bg": "#f7dc8b",
    "art": "<ellipse cx=\"48\" cy=\"54\" rx=\"24\" ry=\"22\" fill=\"#b5651d\"/><ellipse cx=\"48\" cy=\"62\" rx=\"14\" ry=\"12\" fill=\"#e8c39e\"/><polygon points=\"70,50 86,54 70,58\" fill=\"#5d4037\"/><circle cx=\"43\" cy=\"48\" r=\"3.5\" fill=\"#1b1b1b\"/><circle cx=\"61\" cy=\"48\" r=\"3.5\" fill=\"#1b1b1b\"/><circle cx=\"44.3\" cy=\"46.7\" r=\"1.2\" fill=\"#fff\"/><circle cx=\"62.3\" cy=\"46.7\" r=\"1.2\" fill=\"#fff\"/>"
  },
  {
    "id": "yaguarete",
    "name": "Yaguareté",
    "group": "Fauna argentina",
    "bg": "#2e7d32",
    "art": "<circle cx=\"28\" cy=\"28\" r=\"9\" fill=\"#e9a23b\"/><circle cx=\"68\" cy=\"28\" r=\"9\" fill=\"#e9a23b\"/><circle cx=\"48\" cy=\"52\" r=\"28\" fill=\"#e9a23b\"/><ellipse cx=\"48\" cy=\"64\" rx=\"14\" ry=\"10\" fill=\"#f6e3c3\"/><polygon points=\"44,60 52,60 48,65\" fill=\"#4e342e\"/><circle cx=\"32\" cy=\"40\" r=\"3\" fill=\"none\" stroke=\"#4e342e\" stroke-width=\"2\"/><circle cx=\"64\" cy=\"40\" r=\"3\" fill=\"none\" stroke=\"#4e342e\" stroke-width=\"2\"/><circle cx=\"48\" cy=\"32\" r=\"3\" fill=\"none\" stroke=\"#4e342e\" stroke-width=\"2\"/><circle cx=\"30\" cy=\"58\" r=\"3\" fill=\"none\" stroke=\"#4e342e\" stroke-width=\"2\"/><circle cx=\"66\" cy=\"58\" r=\"3\" fill=\"none\" stroke=\"#4e342e\" stroke-width=\"2\"/><circle cx=\"37\" cy=\"48\" r=\"3.5\" fill=\"#1b3a1b\"/><circle cx=\"59\" cy=\"48\" r=\"3.5\" fill=\"#1b3a1b\"/><circle cx=\"38.3\" cy=\"46.7\" r=\"1.2\" fill=\"#fff\"/><circle cx=\"60.3\" cy=\"46.7\" r=\"1.2\" fill=\"#fff\"/>"
  },
  {
    "id": "pinguino",
    "name": "Pingüino",
    "group": "Fauna argentina",
    "bg": "#9ed6f0",
    "art": "<ellipse cx=\"48\" cy=\"56\" rx=\"28\" ry=\"32\" fill=\"#1b1b1b\"/><ellipse cx=\"48\" cy=\"60\" rx=\"18\" ry=\"22\" fill=\"#fafafa\"/><path d=\"M30 38 q18 -10 36 0\" stroke=\"#f4c11b\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\"/><polygon points=\"44,52 52,52 48,58\" fill=\"#f39c12\"/><circle cx=\"39\" cy=\"46\" r=\"4\" fill=\"#1b1b1b\"/><circle cx=\"57\" cy=\"46\" r=\"4\" fill=\"#1b1b1b\"/><circle cx=\"40.3\" cy=\"44.7\" r=\"1.2\" fill=\"#fff\"/><circle cx=\"58.3\" cy=\"44.7\" r=\"1.2\" fill=\"#fff\"/>"
  },
  {
    "id": "zorro",
    "name": "Zorro",
    "group": "Fauna argentina",
    "bg": "#f4ead5",
    "art": "<polygon points=\"20,22 40,34 28,48\" fill=\"#d35400\"/><polygon points=\"76,22 56,34 68,48\" fill=\"#d35400\"/><path d=\"M22 40 Q48 20 74 40 L48 80 Z\" fill=\"#e67e22\"/><path d=\"M30 48 L48 80 L66 48 Q48 60 30 48 Z\" fill=\"#fafafa\"/><circle cx=\"48\" cy=\"76\" r=\"4\" fill=\"#1b1b1b\"/><circle cx=\"37\" cy=\"50\" r=\"3.2\" fill=\"#1b1b1b\"/><circle cx=\"59\" cy=\"50\" r=\"3.2\" fill=\"#1b1b1b\"/><circle cx=\"38.3\" cy=\"48.7\" r=\"1.2\" fill=\"#fff\"/><circle cx=\"60.3\" cy=\"48.7\" r=\"1.2\" fill=\"#fff\"/>"
  },
  {
    "id": "ballena",
    "name": "Ballena franca",
    "group": "Fauna argentina",
    "bg": "#1f6fa8",
    "art": "<path d=\"M14 62 Q14 38 48 38 Q78 38 80 56 Q82 70 60 72 L30 72 Q14 72 14 62 Z\" fill=\"#2c3e50\"/><path d=\"M80 56 L92 46 L90 60 Z\" fill=\"#2c3e50\"/><path d=\"M22 66 Q48 76 70 66\" stroke=\"#9fb3c8\" stroke-width=\"3\" fill=\"none\"/><circle cx=\"34\" cy=\"54\" r=\"3\" fill=\"#fafafa\"/><path d=\"M40 34 q2 -10 -4 -14 M40 34 q4 -8 10 -10\" stroke=\"#bfe6ff\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/>"
  },
  {
    "id": "buho",
    "name": "Búho",
    "group": "Fauna argentina",
    "bg": "#5b2c6f",
    "art": "<ellipse cx=\"48\" cy=\"56\" rx=\"26\" ry=\"30\" fill=\"#8d6e63\"/><polygon points=\"24,30 34,40 26,44\" fill=\"#6d4c41\"/><polygon points=\"72,30 62,40 70,44\" fill=\"#6d4c41\"/><circle cx=\"38\" cy=\"48\" r=\"10\" fill=\"#fff3c4\"/><circle cx=\"58\" cy=\"48\" r=\"10\" fill=\"#fff3c4\"/><circle cx=\"38\" cy=\"48\" r=\"5\" fill=\"#1b1b1b\"/><circle cx=\"58\" cy=\"48\" r=\"5\" fill=\"#1b1b1b\"/><circle cx=\"39.3\" cy=\"46.7\" r=\"1.2\" fill=\"#fff\"/><circle cx=\"59.3\" cy=\"46.7\" r=\"1.2\" fill=\"#fff\"/><polygon points=\"44,58 52,58 48,66\" fill=\"#f39c12\"/>"
  },
  {
    "id": "tortuga",
    "name": "Tortuga",
    "group": "Fauna argentina",
    "bg": "#d4efdf",
    "art": "<ellipse cx=\"48\" cy=\"58\" rx=\"28\" ry=\"20\" fill=\"#27ae60\"/><path d=\"M48 40 V76 M28 58 H68 M34 46 L62 70 M62 46 L34 70\" stroke=\"#1e8449\" stroke-width=\"3\"/><circle cx=\"78\" cy=\"50\" r=\"9\" fill=\"#58d68d\"/><circle cx=\"81\" cy=\"48\" r=\"2\" fill=\"#1b1b1b\"/>"
  },
  {
    "id": "chevrones",
    "name": "Chevrones",
    "group": "Patrones",
    "bg": "#17171a",
    "art": "<g fill=\"#f4c11b\" transform=\"translate(24 31)\"><polygon points=\"0,0 8,0 19,17 8,34 0,34 11,17\"/><polygon points=\"14,0 22,0 33,17 22,34 14,34 25,17\"/><polygon points=\"28,0 36,0 47,17 36,34 28,34 39,17\"/></g>"
  },
  {
    "id": "rayas",
    "name": "Rayas",
    "group": "Patrones",
    "bg": "#f4c11b",
    "art": "<rect x=\"-40\" y=\"-20\" width=\"8\" height=\"140\" fill=\"#17171a\" transform=\"rotate(35 48 48)\"/><rect x=\"-22\" y=\"-20\" width=\"8\" height=\"140\" fill=\"#17171a\" transform=\"rotate(35 48 48)\"/><rect x=\"-4\" y=\"-20\" width=\"8\" height=\"140\" fill=\"#17171a\" transform=\"rotate(35 48 48)\"/><rect x=\"14\" y=\"-20\" width=\"8\" height=\"140\" fill=\"#17171a\" transform=\"rotate(35 48 48)\"/><rect x=\"32\" y=\"-20\" width=\"8\" height=\"140\" fill=\"#17171a\" transform=\"rotate(35 48 48)\"/><rect x=\"50\" y=\"-20\" width=\"8\" height=\"140\" fill=\"#17171a\" transform=\"rotate(35 48 48)\"/><rect x=\"68\" y=\"-20\" width=\"8\" height=\"140\" fill=\"#17171a\" transform=\"rotate(35 48 48)\"/><rect x=\"86\" y=\"-20\" width=\"8\" height=\"140\" fill=\"#17171a\" transform=\"rotate(35 48 48)\"/><rect x=\"104\" y=\"-20\" width=\"8\" height=\"140\" fill=\"#17171a\" transform=\"rotate(35 48 48)\"/><rect x=\"122\" y=\"-20\" width=\"8\" height=\"140\" fill=\"#17171a\" transform=\"rotate(35 48 48)\"/>"
  },
  {
    "id": "ondas",
    "name": "Ondas",
    "group": "Patrones",
    "bg": "#3fa9f5",
    "art": "<path d=\"M-10 14 q12 -10 24 0 t24 0 t24 0 t24 0 t24 0\" stroke=\"#fafafa\" stroke-width=\"5\" fill=\"none\"/><path d=\"M-10 30 q12 -10 24 0 t24 0 t24 0 t24 0 t24 0\" stroke=\"#fafafa\" stroke-width=\"5\" fill=\"none\"/><path d=\"M-10 46 q12 -10 24 0 t24 0 t24 0 t24 0 t24 0\" stroke=\"#fafafa\" stroke-width=\"5\" fill=\"none\"/><path d=\"M-10 62 q12 -10 24 0 t24 0 t24 0 t24 0 t24 0\" stroke=\"#fafafa\" stroke-width=\"5\" fill=\"none\"/><path d=\"M-10 78 q12 -10 24 0 t24 0 t24 0 t24 0 t24 0\" stroke=\"#fafafa\" stroke-width=\"5\" fill=\"none\"/><path d=\"M-10 94 q12 -10 24 0 t24 0 t24 0 t24 0 t24 0\" stroke=\"#fafafa\" stroke-width=\"5\" fill=\"none\"/>"
  },
  {
    "id": "puntos",
    "name": "Puntos",
    "group": "Patrones",
    "bg": "#e74c3c",
    "art": "<circle cx=\"8\" cy=\"8\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"8\" cy=\"26\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"8\" cy=\"44\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"8\" cy=\"62\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"8\" cy=\"80\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"26\" cy=\"8\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"26\" cy=\"26\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"26\" cy=\"44\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"26\" cy=\"62\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"26\" cy=\"80\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"44\" cy=\"8\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"44\" cy=\"26\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"44\" cy=\"44\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"44\" cy=\"62\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"44\" cy=\"80\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"62\" cy=\"8\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"62\" cy=\"26\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"62\" cy=\"44\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"62\" cy=\"62\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"62\" cy=\"80\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"80\" cy=\"8\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"80\" cy=\"26\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"80\" cy=\"44\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"80\" cy=\"62\" r=\"5\" fill=\"#fafafa\"/><circle cx=\"80\" cy=\"80\" r=\"5\" fill=\"#fafafa\"/>"
  },
  {
    "id": "cuadros",
    "name": "Cuadros",
    "group": "Patrones",
    "bg": "#fafafa",
    "art": "<rect x=\"0\" y=\"0\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"0\" y=\"32\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"0\" y=\"64\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"16\" y=\"16\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"16\" y=\"48\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"16\" y=\"80\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"32\" y=\"0\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"32\" y=\"32\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"32\" y=\"64\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"48\" y=\"16\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"48\" y=\"48\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"48\" y=\"80\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"64\" y=\"0\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"64\" y=\"32\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"64\" y=\"64\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"80\" y=\"16\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"80\" y=\"48\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/><rect x=\"80\" y=\"80\" width=\"16\" height=\"16\" fill=\"#2e7d32\"/>"
  },
  {
    "id": "sol",
    "name": "Sol",
    "group": "Patrones",
    "bg": "#f39c12",
    "art": "<rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(0 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(20 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(40 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(60 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(80 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(100 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(120 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(140 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(160 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(180 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(200 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(220 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(240 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(260 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(280 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(300 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(320 48 48)\"/><rect x=\"46\" y=\"-4\" width=\"4\" height=\"40\" fill=\"#ffd34d\" transform=\"rotate(340 48 48)\"/><circle cx=\"48\" cy=\"48\" r=\"18\" fill=\"#ffd34d\"/>"
  },
  {
    "id": "montanas",
    "name": "Montañas",
    "group": "Patrones",
    "bg": "#bfe3f5",
    "art": "<polygon points=\"0,96 30,46 52,76 70,40 96,96\" fill=\"#5d6d7e\"/><polygon points=\"30,46 38,58 22,58\" fill=\"#fafafa\"/><polygon points=\"70,40 79,54 61,54\" fill=\"#fafafa\"/><circle cx=\"20\" cy=\"24\" r=\"8\" fill=\"#f4c11b\"/>"
  },
  {
    "id": "grilla",
    "name": "Grilla",
    "group": "Patrones",
    "bg": "#8e44ad",
    "art": "<path d=\"M12 0 V96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M24 0 V96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M36 0 V96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M48 0 V96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M60 0 V96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M72 0 V96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M84 0 V96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M0 12 H96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M0 24 H96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M0 36 H96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M0 48 H96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M0 60 H96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M0 72 H96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><path d=\"M0 84 H96\" stroke=\"#d2b4de\" stroke-width=\"2\"/><circle cx=\"48\" cy=\"48\" r=\"16\" fill=\"#f4c11b\"/>"
  }
]
