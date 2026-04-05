const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const swaggerUi = require('swagger-ui-express');

dotenv.config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.SHEET_ID;
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A:H';

if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
  console.error('GOOGLE_CLIENT_EMAIL yoki GOOGLE_PRIVATE_KEY topilmadi');
  process.exit(1);
}

if (!SHEET_ID) {
  console.error('SHEET_ID topilmadi');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

function normalizePhone(phone = '') {
  let cleaned = String(phone).replace(/\D/g, '');

  if (cleaned.length === 9) {
    cleaned = '998' + cleaned;
  }

  if (cleaned.length === 12 && cleaned.startsWith('998')) {
    return cleaned;
  }

  return cleaned;
}

function formatDate() {
  return new Date().toLocaleString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
  });
}

async function getSheetsClient() {
  const client = await auth.getClient();

  return google.sheets({
    version: 'v4',
    auth: client,
  });
}

async function getAllRows() {
  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
  });

  return response.data.values || [];
}

async function appendRow(row) {
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });
}

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'VSL Lead API',
    version: '1.0.0',
    description: 'VSL sayt uchun lead yig‘ish API',
  },
  servers: [
    {
      url: 'http://localhost:3000',
    },
  ],
  paths: {
    '/': {
      get: {
        summary: 'Server holati',
        responses: {
          200: {
            description: 'Server ishlayapti',
          },
        },
      },
    },
    '/lead': {
      post: {
        summary: 'Yangi lead qo‘shish',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'phone'],
                properties: {
                  name: {
                    type: 'string',
                    example: 'Behruz',
                  },
                  phone: {
                    type: 'string',
                    example: '+998901234567',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Lead muvaffaqiyatli saqlandi',
          },
          200: {
            description: 'Dubl lead topildi',
          },
          400: {
            description: 'Noto‘g‘ri ma’lumot',
          },
          500: {
            description: 'Server xatoligi',
          },
        },
      },
    },
  },
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VSL backend ishlayapti',
  });
});

app.post('/lead', async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Ism va telefon kiritilishi kerak',
      });
    }

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || normalizedPhone.length !== 12) {
      return res.status(400).json({
        success: false,
        message: 'Telefon raqam noto‘g‘ri',
      });
    }

    const rows = await getAllRows();
    const dataRows = rows.slice(1);

    const duplicateRow = dataRows.find((row) => row[3] === normalizedPhone);

    if (duplicateRow) {
      return res.status(200).json({
        success: false,
        duplicate: true,
        message: 'Siz avval ro‘yxatdan o‘tgansiz',
      });
    }

    const nextId = dataRows.length + 1;

    const newRow = [
      nextId,
      name,
      phone,
      normalizedPhone,
      formatDate(),
      'vsl-site',
      'yangi',
      '',
    ];

    await appendRow(newRow);

    return res.status(201).json({
      success: true,
      duplicate: false,
      message: "Ro‘yxatdan o‘tish muvaffaqiyatli yakunlandi",
    });
  } catch (error) {
    console.error('Lead saqlashda xatolik:', error?.response?.data || error.message || error);

    return res.status(500).json({
      success: false,
      message: 'Serverda xatolik yuz berdi',
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger: http://localhost:${PORT}/api-docs`);
});