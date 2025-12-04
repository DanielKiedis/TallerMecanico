require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// CONEXIÓN MYSQL - Configuración para XAMPP
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'taller_mecanico',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4'
});

db.connect((err) => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        console.log('Asegúrate de que:');
        console.log('   1. XAMPP esté ejecutándose');
        console.log('   2. MySQL esté activo en XAMPP');
        console.log('   3. La base de datos "taller_mecanico" exista');
        console.log('   4. Usuario: root, Contraseña: (vacía)');
        process.exit(1);
    }
    console.log('Conectado a MySQL/phpMyAdmin');
    
    // Crear tablas si no existen
    createTables();
});

// FUNCIÓN PARA CREAR TABLAS
function createTables() {
    const createTableQueries = [
        // Tabla usuarios
        `CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'user'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Tabla citas
        `CREATE TABLE IF NOT EXISTS citas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            correo VARCHAR(100) NOT NULL,
            telefono VARCHAR(20) NOT NULL,
            marca_carro VARCHAR(50) NOT NULL,
            modelo_carro VARCHAR(50) NOT NULL,
            año_carro INT NOT NULL,
            descripcion TEXT NOT NULL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            estado VARCHAR(20) DEFAULT 'pendiente'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Tabla gruas
        `CREATE TABLE IF NOT EXISTS gruas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            correo VARCHAR(100) NOT NULL,
            telefono VARCHAR(20) NOT NULL,
            marca_carro VARCHAR(50) NOT NULL,
            modelo_carro VARCHAR(50) NOT NULL,
            año_carro INT NOT NULL,
            ubicacion TEXT NOT NULL,
            descripcion_falla TEXT NOT NULL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            estado VARCHAR(20) DEFAULT 'pendiente'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Tabla servicios
        `CREATE TABLE IF NOT EXISTS servicios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            descripcion TEXT NOT NULL,
            precio DECIMAL(10,2) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Tabla ofertas
        `CREATE TABLE IF NOT EXISTS ofertas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo VARCHAR(100) NOT NULL,
            descripcion TEXT NOT NULL,
            descuento VARCHAR(20) NOT NULL,
            valido_hasta DATE NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];

    // Ejecutar cada query de creación
    createTableQueries.forEach((query, index) => {
        db.query(query, (err) => {
            if (err) {
                console.error(`Error creando tabla ${index + 1}:`, err.message);
            }
        });
    });

    // Insertar usuario admin por defecto
    const insertAdminQuery = `INSERT IGNORE INTO usuarios (username, password, role) VALUES ('admin', 'admin123', 'admin')`;
    db.query(insertAdminQuery, (err) => {
        if (err) {
            console.error('Error insertando usuario admin:', err.message);
        } else {
            console.log('Usuario admin creado: admin/admin123');
        }
    });

    // Insertar datos de ejemplo después de un pequeño delay
    setTimeout(insertSampleData, 1000);
}

// FUNCIÓN PARA INSERTAR DATOS DE EJEMPLO
function insertSampleData() {
    // Datos de ejemplo para servicios
    const serviciosEjemplo = [
        ['Cambio de aceite sintético', 'Cambio completo de aceite sintético premium y filtro. Incluye revisión de niveles de fluidos.', 899.99],
        ['Alineación y balanceo láser', 'Alineación de dirección computarizada y balanceo de llantas con tecnología láser. Incluye rotación.', 1199.99],
        ['Servicio completo de frenos', 'Cambio de balatas, discos, líquido de frenos y revisión de sistema hidráulico. Garantía 2 años.', 2499.99],
        ['Reparación de suspensión', 'Revisión y reparación completa del sistema de suspensión: amortiguadores, ballestas, bujes.', 3899.99],
        ['Servicio de transmisión', 'Cambio de fluido de transmisión automática o manual, ajuste y diagnóstico computarizado.', 3299.99]
    ];

    // Verificar si ya hay servicios
    db.query('SELECT COUNT(*) as count FROM servicios', (err, results) => {
        if (!err && results[0].count === 0) {
            console.log('Insertando servicios de ejemplo...');
            serviciosEjemplo.forEach(servicio => {
                db.query('INSERT INTO servicios (nombre, descripcion, precio) VALUES (?, ?, ?)', servicio, (err) => {
                    if (err) console.error('Error insertando servicio:', err.message);
                });
            });
            console.log('Servicios de ejemplo insertados');
        }
    });

    // Datos de ejemplo para ofertas
    const ofertasEjemplo = [
        ['Mantenimiento Primaveral 2024', '¡Prepárate para la primavera! Paquete completo: cambio de aceite, alineación, revisión de aire acondicionado y diagnóstico gratis.', '25%', '2024-06-30'],
        ['Promo 2x1 Familiar', 'Trae el auto de un familiar y el segundo servicio tiene 40% de descuento. Válido para servicios mayores a $1,500.', '40%', '2024-12-31'],
        ['Aceite Sintético Premium', 'Cambio de aceite sintético total con 20% de descuento. Incluye filtro de aire y diagnóstico gratuito.', '20%', '2024-05-15'],
        ['Kit Frenos Seguridad Total', 'Cambio completo de frenos + líquido + diagnóstico. ¡Incluye pastillas de cortesía para próximos cambios!', '30%', '2024-07-20']
    ];

    // Verificar si ya hay ofertas
    db.query('SELECT COUNT(*) as count FROM ofertas', (err, results) => {
        if (!err && results[0].count === 0) {
            console.log('Insertando ofertas de ejemplo...');
            ofertasEjemplo.forEach(oferta => {
                db.query('INSERT INTO ofertas (titulo, descripcion, descuento, valido_hasta) VALUES (?, ?, ?, ?)', oferta, (err) => {
                    if (err) console.error('Error insertando oferta:', err.message);
                });
            });
            console.log('Ofertas de ejemplo insertadas');
        }
    });
}

// Configuración de correo (transporter) - MANTIENE LA MISMA CONFIGURACIÓN
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware para verificar admin (NO CAMBIA)
function verificarAdmin(req, res, next) {
    const token = req.headers.authorization;
    if (token === 'admin-token') {
        next();
    } else {
        res.status(403).json({ error: 'Acceso no autorizado' });
    }
}

// RUTAS DE LA API (TODAS MODIFICADAS PARA MYSQL)

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM usuarios WHERE username = ? AND password = ?', 
        [username, password], (err, results) => {
            if (err || !results[0]) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            const user = results[0];
            const token = user.role === 'admin' ? 'admin-token' : 'user-token';
            res.json({ token, role: user.role, username: user.username });
        }
    );
});

// Información de misión/visión
app.get('/api/info/mision-vision', (req, res) => {
    res.json({
        mision: 'Proveer servicios mecánicos de calidad con honestidad y profesionalismo, garantizando la seguridad y satisfacción de nuestros clientes.',
        vision: 'Ser el taller mecánico líder en la región para 2025, reconocido por nuestra excelencia en servicio y tecnología de vanguardia.',
        objetivo: 'Garantizar la satisfacción total de nuestros clientes mediante servicios oportunos, personal calificado y precios competitivos.'
    });
});

// Obtener servicios
app.get('/api/servicios', (req, res) => {
    db.query('SELECT * FROM servicios', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Obtener ofertas
app.get('/api/ofertas', (req, res) => {
    db.query('SELECT * FROM ofertas', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Crear cita
app.post('/api/citas', (req, res) => {
    const { nombre, correo, telefono, marca_carro, modelo_carro, año_carro, descripcion } = req.body;
    
    db.query(`INSERT INTO citas (nombre, correo, telefono, marca_carro, modelo_carro, año_carro, descripcion) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nombre, correo, telefono, marca_carro, modelo_carro, año_carro, descripcion],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: correo,
                subject: 'Confirmación de Cita - Taller Mecánico Pro',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <h2 style="color: #2c3e50; text-align: center;">¡Cita Confirmada!</h2>
                        <p>Estimado(a) <strong>${nombre}</strong>,</p>
                        <p>Su cita ha sido registrada exitosamente en nuestro sistema.</p>
                        
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #e74c3c; margin-top: 0;">Detalles de la cita:</h3>
                            <p><strong>Teléfono:</strong> ${telefono}</p>
                            <p><strong>Vehículo:</strong> ${marca_carro} ${modelo_carro} (${año_carro})</p>
                            <p><strong>Descripción:</strong> ${descripcion}</p>
                        </div>
                        
                        <p>Nos pondremos en contacto en las próximas 24 horas para confirmar la fecha y hora exacta de su cita.</p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px;">Taller Mecánico<br>
                            Av. Principal #123, Ciudad Juarez<br>
                            (123) 456-7890<br>
                            ✉️ Marco@tallermecanicopro.com</p>
                        </div>
                    </div>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error enviando correo:', error);
                } else {
                    console.log('Correo enviado:', info.response);
                }
            });

            res.json({ id: results.insertId, message: 'Cita creada y correo enviado' });
        }
    );
});

// Solicitar grúa
app.post('/api/gruas', (req, res) => {
    const { nombre, correo, telefono, marca_carro, modelo_carro, año_carro, ubicacion, descripcion_falla } = req.body;
    
    db.query(`INSERT INTO gruas (nombre, correo, telefono, marca_carro, modelo_carro, año_carro, ubicacion, descripcion_falla) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, correo, telefono, marca_carro, modelo_carro, año_carro, ubicacion, descripcion_falla],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: correo,
                subject: 'Solicitud de Grúa Registrada - Taller Mecánico Pro',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <h2 style="color: #2c3e50; text-align: center;">¡Solicitud de Grúa Recibida!</h2>
                        <p>Estimado(a) <strong>${nombre}</strong>,</p>
                        <p>Su solicitud de grúa ha sido registrada exitosamente.</p>
                        
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #e74c3c; margin-top: 0;">Detalles de la solicitud:</h3>
                            <p><strong>Teléfono:</strong> ${telefono}</p>
                            <p><strong>Vehículo:</strong> ${marca_carro} ${modelo_carro} (${año_carro})</p>
                            <p><strong>Ubicación:</strong> ${ubicacion}</p>
                            <p><strong>Falla reportada:</strong> ${descripcion_falla}</p>
                        </div>
                        
                        <p>Nuestro equipo de auxilio vial se pondrá en contacto con usted en los próximos 15-20 minutos.</p>
                        <p style="color: #e74c3c; font-weight: bold;"> Por su seguridad, permanezca en un lugar seguro.</p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px;">Taller Mecánico Pro - Servicio de Grúa 24/7<br>
                            Emergencias: (123) 456-7891<br>
                            gruas@tallermecanicopro.com</p>
                        </div>
                    </div>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error enviando correo:', error);
                } else {
                    console.log('Correo de grúa enviado:', info.response);
                }
            });

            res.json({ id: results.insertId, message: 'Solicitud de grúa registrada' });
        }
    );
});

// Ubicación
app.get('/api/ubicacion', (req, res) => {
    res.json({
        direccion: 'Av. Tecnológico #1500, Col. Centro, Ciudad de México, CDMX 06300',
        telefono: '+52 (55) 1234-5678',
        whatsapp: '+52 (55) 8765-4321',
        horario: 'Lunes a Viernes: 8:00 AM - 8:00 PM<br>Sábados: 9:00 AM - 4:00 PM<br>Domingos: Emergencias 24/7',
        coordenadas: { lat: 19.4326, lng: -99.1332 },
        servicios_especiales: 'Grúa 24/7 • Diagnóstico gratuito • Parqueo vigilado'
    });
});

// Nosotros
app.get('/api/nosotros', (req, res) => {
    res.json({
        historia: 'Fundado en 2010 por el Ing. Roberto Martínez, comenzamos como un pequeño taller familiar. Hoy, con más de 13 años de experiencia, hemos crecido hasta convertirnos en un referente de confianza en servicios automotrices, atendiendo más de 500 vehículos mensualmente.',
        equipo: 'Contamos con 15 mecánicos certificados por las marcas líderes (Ford, GM, Toyota, Volkswagen), 3 especialistas en electrónica automotriz y 2 ingenieros en diagnóstico avanzado. Todos con más de 5 años de experiencia en el sector.',
        valores: 'Honestidad: Decimos lo que hacemos y hacemos lo que decimos.<br>Calidad: Usamos repuestos originales y herramientas de precisión.<br>Responsabilidad: Garantía de 1 año en todos nuestros servicios.<br>Servicio al Cliente: Atención personalizada y seguimiento post-servicio.',
        certificaciones: 'ISO 9001:2015 • ASE Certified • AAA Approved Auto Repair'
    });
});

// ========== RUTAS DE ADMINISTRACIÓN ==========

// Obtener todas las citas (admin)
app.get('/api/admin/citas', verificarAdmin, (req, res) => {
    db.query('SELECT * FROM citas ORDER BY fecha DESC', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Obtener todas las grúas (admin)
app.get('/api/admin/gruas', verificarAdmin, (req, res) => {
    db.query('SELECT * FROM gruas ORDER BY fecha DESC', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Obtener todos los usuarios (admin)
app.get('/api/admin/usuarios', verificarAdmin, (req, res) => {
    db.query('SELECT id, username, role FROM usuarios', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Crear nuevo usuario (admin)
app.post('/api/admin/usuarios', verificarAdmin, (req, res) => {
    const { username, password, role } = req.body;
    db.query('INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)',
        [username, password, role || 'user'],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: results.insertId });
        }
    );
});

// Actualizar usuario (admin)
app.put('/api/admin/usuarios/:id', verificarAdmin, (req, res) => {
    const { username, password, role } = req.body;
    const id = req.params.id;
    
    let query = 'UPDATE usuarios SET username = ?, role = ?';
    let params = [username, role];
    
    if (password) {
        query += ', password = ?';
        params.push(password);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    db.query(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ affectedRows: results.affectedRows });
    });
});

// Eliminar usuario (admin)
app.delete('/api/admin/usuarios/:id', verificarAdmin, (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM usuarios WHERE id = ? AND role != "admin"', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ affectedRows: results.affectedRows });
    });
});

// Actualizar estado de cita (admin)
app.put('/api/admin/citas/:id', verificarAdmin, (req, res) => {
    const { estado } = req.body;
    db.query('UPDATE citas SET estado = ? WHERE id = ?', [estado, req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ affectedRows: results.affectedRows });
    });
});

// Actualizar estado de grúa (admin)
app.put('/api/admin/gruas/:id', verificarAdmin, (req, res) => {
    const { estado } = req.body;
    db.query('UPDATE gruas SET estado = ? WHERE id = ?', [estado, req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ affectedRows: results.affectedRows });
    });
});

// ========== CONFIGURACIÓN FINAL ==========

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Taller Mecánico corriendo en: http://localhost:${PORT}`);
    console.log(`Admin: usuario="admin", contraseña="admin123"`);
    console.log(`Base de datos: MySQL (XAMPP)`);
    console.log(`Configuración de correo: ${process.env.EMAIL_USER ? 'Configurada' : 'No configurada (usar simulación)'}`);
});

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
    console.error('Error no capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada:', reason);
});
