require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        correo TEXT,
        telefono TEXT,
        marca_carro TEXT,
        modelo_carro TEXT,
        año_carro INTEGER,
        descripcion TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'pendiente'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS gruas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        correo TEXT,
        telefono TEXT,
        marca_carro TEXT,
        modelo_carro TEXT,
        año_carro INTEGER,
        ubicacion TEXT,
        descripcion_falla TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'pendiente'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS servicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        descripcion TEXT,
        precio REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ofertas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        descripcion TEXT,
        descuento TEXT,
        valido_hasta TEXT
    )`);

    db.run(`INSERT OR IGNORE INTO usuarios (username, password, role) VALUES ('admin', 'admin123', 'admin')`);
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function verificarAdmin(req, res, next) {
    const token = req.headers.authorization;
    if (token === 'admin-token') {
        next();
    } else {
        res.status(403).json({ error: 'Acceso no autorizado' });
    }
}

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM usuarios WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const token = user.role === 'admin' ? 'admin-token' : 'user-token';
        res.json({ token, role: user.role, username: user.username });
    });
});

app.get('/api/info/mision-vision', (req, res) => {
    res.json({
        mision: 'Proveer servicios mecánicos de calidad con honestidad y profesionalismo, garantizando la seguridad y satisfacción de nuestros clientes.',
        vision: 'Ser el taller mecánico líder en la región para 2025, reconocido por nuestra excelencia en servicio y tecnología de vanguardia.',
        objetivo: 'Garantizar la satisfacción total de nuestros clientes mediante servicios oportunos, personal calificado y precios competitivos.'
    });
});

app.get('/api/servicios', (req, res) => {
    db.all('SELECT * FROM servicios', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/ofertas', (req, res) => {
    db.all('SELECT * FROM ofertas', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/citas', (req, res) => {
    const { nombre, correo, telefono, marca_carro, modelo_carro, año_carro, descripcion } = req.body;
    
    db.run(`INSERT INTO citas (nombre, correo, telefono, marca_carro, modelo_carro, año_carro, descripcion) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nombre, correo, telefono, marca_carro, modelo_carro, año_carro, descripcion],
        function(err) {
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
                            <p><strong>📞 Teléfono:</strong> ${telefono}</p>
                            <p><strong>🚗 Vehículo:</strong> ${marca_carro} ${modelo_carro} (${año_carro})</p>
                            <p><strong>🔧 Descripción:</strong> ${descripcion}</p>
                        </div>
                        
                        <p>Nos pondremos en contacto en las próximas 24 horas para confirmar la fecha y hora exacta de su cita.</p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px;">Taller Mecánico Pro<br>
                            📍 Av. Principal #123, Ciudad<br>
                            📞 (123) 456-7890<br>
                            ✉️ contacto@tallermecanicopro.com</p>
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

            res.json({ id: this.lastID, message: 'Cita creada y correo enviado' });
        }
    );
});

app.post('/api/gruas', (req, res) => {
    const { nombre, correo, telefono, marca_carro, modelo_carro, año_carro, ubicacion, descripcion_falla } = req.body;
    
    db.run(`INSERT INTO gruas (nombre, correo, telefono, marca_carro, modelo_carro, año_carro, ubicacion, descripcion_falla) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, correo, telefono, marca_carro, modelo_carro, año_carro, ubicacion, descripcion_falla],
        function(err) {
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
                            <p><strong>📞 Teléfono:</strong> ${telefono}</p>
                            <p><strong>🚗 Vehículo:</strong> ${marca_carro} ${modelo_carro} (${año_carro})</p>
                            <p><strong>📍 Ubicación:</strong> ${ubicacion}</p>
                            <p><strong>🔧 Falla reportada:</strong> ${descripcion_falla}</p>
                        </div>
                        
                        <p>Nuestro equipo de auxilio vial se pondrá en contacto con usted en los próximos 15-20 minutos.</p>
                        <p style="color: #e74c3c; font-weight: bold;">⚠️ Por su seguridad, permanezca en un lugar seguro.</p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 14px;">Taller Mecánico Pro - Servicio de Grúa 24/7<br>
                            🚨 Emergencias: (123) 456-7891<br>
                            ✉️ gruas@tallermecanicopro.com</p>
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

            res.json({ id: this.lastID, message: 'Solicitud de grúa registrada' });
        }
    );
});

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

app.get('/api/nosotros', (req, res) => {
    res.json({
        historia: 'Fundado en 2010 por el Ing. Roberto Martínez, comenzamos como un pequeño taller familiar. Hoy, con más de 13 años de experiencia, hemos crecido hasta convertirnos en un referente de confianza en servicios automotrices, atendiendo más de 500 vehículos mensualmente.',
        equipo: 'Contamos con 15 mecánicos certificados por las marcas líderes (Ford, GM, Toyota, Volkswagen), 3 especialistas en electrónica automotriz y 2 ingenieros en diagnóstico avanzado. Todos con más de 5 años de experiencia en el sector.',
        valores: 'Honestidad: Decimos lo que hacemos y hacemos lo que decimos.<br>Calidad: Usamos repuestos originales y herramientas de precisión.<br>Responsabilidad: Garantía de 1 año en todos nuestros servicios.<br>Servicio al Cliente: Atención personalizada y seguimiento post-servicio.',
        certificaciones: 'ISO 9001:2015 • ASE Certified • AAA Approved Auto Repair'
    });
});

app.get('/api/admin/citas', verificarAdmin, (req, res) => {
    db.all('SELECT * FROM citas ORDER BY fecha DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/admin/gruas', verificarAdmin, (req, res) => {
    db.all('SELECT * FROM gruas ORDER BY fecha DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/admin/usuarios', verificarAdmin, (req, res) => {
    db.all('SELECT id, username, role FROM usuarios', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/admin/usuarios', verificarAdmin, (req, res) => {
    const { username, password, role } = req.body;
    db.run('INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)',
        [username, password, role || 'user'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID });
        }
    );
});

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
    
    db.run(query, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ changes: this.changes });
    });
});

app.delete('/api/admin/usuarios/:id', verificarAdmin, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM usuarios WHERE id = ? AND role != "admin"', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ changes: this.changes });
    });
});

app.put('/api/admin/citas/:id', verificarAdmin, (req, res) => {
    const { estado } = req.body;
    db.run('UPDATE citas SET estado = ? WHERE id = ?', [estado, req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ changes: this.changes });
    });
});

app.put('/api/admin/gruas/:id', verificarAdmin, (req, res) => {
    const { estado } = req.body;
    db.run('UPDATE gruas SET estado = ? WHERE id = ?', [estado, req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ changes: this.changes });
    });
});

setTimeout(() => {
    db.get('SELECT COUNT(*) as count FROM servicios', (err, row) => {
        if (row && row.count === 0) {
            const servicios = [
                ['Cambio de aceite sintético', 'Cambio completo de aceite sintético premium y filtro. Incluye revisión de niveles de fluidos.', 899.99],
                ['Alineación y balanceo laser', 'Alineación de dirección computarizada y balanceo de llantas con tecnología láser. Incluye rotación.', 1199.99],
                ['Servicio completo de frenos', 'Cambio de balatas, discos, líquido de frenos y revisión de sistema hidráulico. Garantía 2 años.', 2499.99],
                ['Reparación de suspensión', 'Revisión y reparación completa del sistema de suspensión: amortiguadores, ballestas, bujes.', 3899.99],
                ['Servicio de transmisión', 'Cambio de fluido de transmisión automática o manual, ajuste y diagnóstico computarizado.', 3299.99],
                ['Diagnóstico computarizado completo', 'Escaneo OBD-II de todos los sistemas electrónicos del vehículo. Reporte detallado incluido.', 499.99],
                ['Servicio de aire acondicionado', 'Recarga de gas R134a, limpieza de conductos, cambio de filtro de cabina y prueba de presión.', 1599.99],
                ['Sistema eléctrico y batería', 'Prueba de carga, revisión de alternador, instalación de batería nueva y limpieza de terminales.', 1799.99],
                ['Lavado y detailing premium', 'Lavado exterior e interior, encerado, limpieza de tapicería, pulido de faros y llantas.', 1299.99],
                ['Mantenimiento mayor 100,000 km', 'Servicio completo: banda de tiempo, bomba de agua, bujías, filtros y fluidos.', 5899.99]
            ];
            
            const stmt = db.prepare('INSERT INTO servicios (nombre, descripcion, precio) VALUES (?, ?, ?)');
            servicios.forEach(servicio => {
                stmt.run(servicio);
            });
            stmt.finalize();
            console.log('✅ Servicios de prueba agregados');
        }
    });

    db.get('SELECT COUNT(*) as count FROM ofertas', (err, row) => {
        if (row && row.count === 0) {
            const ofertas = [
                ['Mantenimiento Primaveral 2024', '¡Prepárate para la primavera! Paquete completo: cambio de aceite, alineación, revisión de aire acondicionado y diagnóstico gratis.', '25%', '2024-06-30'],
                ['Promo 2x1 Familiar', 'Trae el auto de un familiar y el segundo servicio tiene 40% de descuento. Válido para servicios mayores a $1,500.', '40%', '2024-12-31'],
                ['Aceite Sintético Premium', 'Cambio de aceite sintético total con 20% de descuento. Incluye filtro de aire y diagnóstico gratuito.', '20%', '2024-05-15'],
                ['Kit Frenos Seguridad Total', 'Cambio completo de frenos + líquido + diagnóstico. ¡Incluye pastillas de cortesía para próximos cambios!', '30%', '2024-07-20'],
                ['Combo Suspensión Premium', 'Alineación láser + balanceo + revisión de suspensión completa. ¡Garantía extendida a 3 años!', '25%', '2024-08-10'],
                ['Lavado + Encerado Gratis', 'Lavado exterior premium + encerado con cualquier servicio mayor a $2,000. ¡Hasta 3 veces por cliente!', 'Gratis', '2024-04-30'],
                ['Diagnóstico Gratis por 1 Año', 'Con tu primera compra mayor a $3,000, obtén diagnósticos computarizados gratis por todo un año.', '100%', '2024-09-01'],
                ['Promo Estudiantes y Maestros', 'Presenta tu credencial y obtén 15% de descuento en todos nuestros servicios. Válido todo el año.', '15%', '2024-12-31'],
                ['Servicio de Grúa 50% OFF', 'Solicita nuestra grúa y obtén 50% de descuento en la mano de obra de la reparación. ¡Solo por tiempo limitado!', '50%', '2024-03-31'],
                ['Primera Cita Especial', '¿Primera vez con nosotros? Obtén 20% de descuento en tu primer servicio + revisión gratuita de 21 puntos.', '20%', '2024-06-15']
            ];
            
            const stmt = db.prepare('INSERT INTO ofertas (titulo, descripcion, descuento, valido_hasta) VALUES (?, ?, ?, ?)');
            ofertas.forEach(oferta => {
                stmt.run(oferta);
            });
            stmt.finalize();
            console.log('✅ Ofertas de prueba agregadas');
        }
    });
}, 2000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚗 Servidor Taller Mecánico corriendo en: http://localhost:${PORT}`);
    console.log(`👤 Admin: usuario="admin", contraseña="admin123"`);
});