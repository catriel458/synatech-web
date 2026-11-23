<?php
/* ═══════════════════════════════════════════════════════════
   SYNATECH SRL — contacto.php
   PHP 7.4+ — Recibe POST (JSON o form-data), valida, envía
═══════════════════════════════════════════════════════════ */

/* ── Configuración ───────────────────────────────────────── */
define('DEST_EMAIL',      'contacto@synatech.com.ar');
define('FROM_DOMAIN',     'synatech.com.ar');
define('SITE_NAME',       'SYNATECH SRL');
define('MAX_PER_SESSION', 3);    // máximo de envíos por sesión
define('SESSION_WINDOW',  3600); // ventana en segundos (1 hora)

/* ── Headers de respuesta ────────────────────────────────── */
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

/* Solo POST */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Método no permitido.']);
    exit;
}

/* ── Rate limit por sesión ───────────────────────────────── */
session_start();

if (empty($_SESSION['ct_first'])) {
    $_SESSION['ct_count'] = 0;
    $_SESSION['ct_first'] = time();
}

// Resetear si pasó la ventana de tiempo
if ((time() - $_SESSION['ct_first']) > SESSION_WINDOW) {
    $_SESSION['ct_count'] = 0;
    $_SESSION['ct_first'] = time();
}

if ($_SESSION['ct_count'] >= MAX_PER_SESSION) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'message' => 'Demasiadas solicitudes. Por favor intentá de nuevo en una hora.']);
    exit;
}

/* ── Parsear datos ───────────────────────────────────────── */
$raw = [];
$ct  = $_SERVER['CONTENT_TYPE'] ?? '';

if (strpos($ct, 'application/json') !== false) {
    $json = file_get_contents('php://input');
    $raw  = json_decode($json, true) ?? [];
} else {
    $raw = $_POST;
}

/* ── Honeypot anti-spam ──────────────────────────────────── */
// Si el campo "website" tiene contenido, es un bot
if (!empty($raw['website'])) {
    // Responder OK para no revelar la trampa
    echo json_encode(['ok' => true, 'message' => 'Consulta enviada con éxito.']);
    exit;
}

/* ── Sanitizar ───────────────────────────────────────────── */
function sanitize(string $v): string
{
    return htmlspecialchars(strip_tags(trim($v)), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$nombre   = sanitize($raw['nombre']   ?? '');
$emailRaw = trim($raw['email']        ?? '');
$email    = filter_var($emailRaw, FILTER_SANITIZE_EMAIL);
$telefono = sanitize($raw['telefono'] ?? '');
$area     = sanitize($raw['area']     ?? '');
$mensaje  = sanitize($raw['mensaje']  ?? '');

/* ── Validar ─────────────────────────────────────────────── */
$areasValidas = ['Transformación Digital', 'Migraciones', 'Sistemas a Medida', 'Consultoría Técnica'];
$errores      = [];

if (strlen($nombre) < 2) {
    $errores[] = 'El nombre y apellido es requerido.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errores[] = 'El correo electrónico no es válido.';
}
if (!in_array($area, $areasValidas, true)) {
    $errores[] = 'El área de interés seleccionada no es válida.';
}
if (strlen($mensaje) < 10) {
    $errores[] = 'El mensaje debe tener al menos 10 caracteres.';
}

if (!empty($errores)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => implode(' ', $errores)]);
    exit;
}

/* ── Construir email ─────────────────────────────────────── */
$asunto = '=?UTF-8?B?' . base64_encode('Nueva consulta web — ' . $area) . '?=';

$cuerpo  = "Nueva consulta recibida desde el sitio web de " . SITE_NAME . "\n";
$cuerpo .= str_repeat('─', 48) . "\n\n";
$cuerpo .= "Nombre:    " . $nombre . "\n";
$cuerpo .= "Email:     " . $email  . "\n";
if ($telefono !== '') {
    $cuerpo .= "Teléfono:  " . $telefono . "\n";
}
$cuerpo .= "Área:      " . $area . "\n\n";
$cuerpo .= "Mensaje:\n" . $mensaje . "\n\n";
$cuerpo .= str_repeat('─', 48) . "\n";
$cuerpo .= "Enviado:   " . date('d/m/Y H:i') . " UTC\n";
$cuerpo .= "IP:        " . ($_SERVER['REMOTE_ADDR'] ?? 'desconocida') . "\n";

$headers  = 'From: ' . SITE_NAME . ' <noreply@' . FROM_DOMAIN . '>' . "\r\n";
$headers .= 'Reply-To: ' . $nombre . ' <' . $email . '>' . "\r\n";
$headers .= 'MIME-Version: 1.0' . "\r\n";
$headers .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
$headers .= 'X-Mailer: PHP/' . phpversion() . "\r\n";

/* ── Enviar ──────────────────────────────────────────────── */
$enviado = mail(DEST_EMAIL, $asunto, $cuerpo, $headers);

if ($enviado) {
    $_SESSION['ct_count']++;
    echo json_encode(['ok' => true, 'message' => '¡Consulta enviada con éxito! Nos comunicaremos pronto.']);
} else {
    http_response_code(500);
    echo json_encode([
        'ok'      => false,
        'message' => 'No se pudo enviar el mensaje. Por favor escribinos directamente a ' . DEST_EMAIL . '.'
    ]);
}
