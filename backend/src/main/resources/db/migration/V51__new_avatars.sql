-- Los avatares de las lineas se reemplazaron por dibujos propios (Buenos
-- Aires, fauna y patrones). Quien tenia uno de los viejos pasa a la inicial
-- de su nombre y puede elegir uno nuevo.
UPDATE app_user SET avatar_kind = NULL, avatar_value = NULL
WHERE avatar_kind = 'avatar'
  AND avatar_value NOT IN ('obelisco', 'mate', 'farol', 'bandoneon', 'jacaranda', 'puente', 'sol-de-mayo', 'fileteado',
                           'carpincho', 'hornero', 'yaguarete', 'pinguino', 'zorro', 'ballena', 'buho', 'tortuga',
                           'chevrones', 'rayas', 'ondas', 'puntos', 'cuadros', 'sol', 'montanas', 'grilla');
