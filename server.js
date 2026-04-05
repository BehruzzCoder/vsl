const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const swaggerUi = require('swagger-ui-express');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// ==================== KONFIGURATSIYA ====================
const PORT = 3000;
const SHEET_ID = '1XTga00rTAMmr14j_CL2VmXg8hszuwsYNPVvWDqK7stE';
const SHEET_RANGE = 'Sheet1!A:H';

const GOOGLE_CLIENT_EMAIL = 'sheets-bot-61@lead-system-492400.iam.gserviceaccount.com';
const GOOGLE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDDGuqfDSc767XP
/rq/ytt6cVid1lvWlyBoVwS6jtuWnpOkZSEwDonlJ0TDooDjYuu6irioigWIqH2n
Klmfd7J9otZzZyAfRMSpwlhygcsAVLyMytMEYLio26idK5hPVOFChQaJQQJsTxGe
aaRbuufPd2WClGlrpootal95noCsQ8LLI4/EqW9TNogN9RO95vexz8TYknO+Kre9
arFmd+9PCgvK3ACzEv8kxLaH0/0U6fedwMF94uzx/RX0zI5/ggGbwfIcEygWY3Vw
qh4YUU8fZJNb2A2r1i8+opzZAEEDC4Dx7dqvzAAhBin2bQ1Ch9sDLt7X55o39wFi
O2ggxTY3AgMBAAECggEAVoVuPIBxwLHj28xD9t+3+xGe0cgIzB4S4hKM50qI+L90
C/hJAm3AGx4R8Yv0CmKI1R3FjABBOfw2VNaEDiLfxbVb0quN5C/z4rBr1sPWSVxK
jUk40P0vhrp6iNCXZ77lckFZx65Lq8pYrt58Y618NVXmb0TvhyzApClDE8UFnN5b
8WqcADZh5mnleS3bbzNumvC+GMrtVlat5QB+HZdAU3M5EDbIwqLhsWeD/Vq3rnF/
kOpQg1zCHexT3xj1cT05B/HXitopIlX11LM1y65llCXrYq4xp0hSFucchXatIguw
6ygFMbtBJnDp+3uCP7kf+Tb5m9S6MZ4n60LmxtPyQQKBgQD+mXdjDc+xa/d/toMt
b4+puD5skRYMLGrlKimpIQq8nnXIzXqOXoNSXgtKHlvq0ipG1d+d9hkqYp05G/JW
jJHQka9HupijhoFrwgSKAI+TLqJ6pRyzfq4Fmwwy9CXquPX9TA8CGD+NFrWztato
S21jO9l3U9t3EEFammMbrvCg1wKBgQDELass9mQu6KGFV3WqDAF6DJCEOovPNQyN
CQmHe2tLzicw4DDXgB9Gs5BoagJIz1/GdqqlXGv2oS5lb5xMmCBGRmlzb7T0BRHb
gKPP+39gtyEAvZ+ulWV1FxmM1P71FO92SW9mAUpFxH05BZy2gnenuFVRXUCFXcXT
8Bni0OuJoQKBgQDBFFeS+jVpQwzmgN5IhdN4ja5hnUIQJ1tFwczoY5OF6dI/X30z
HQAQZhu/sPhaQ9ol8Cpu2+TH3ROI7OXCt0YZ23IHPr5lPStHMlNI6RX5M6OqyS7T
/R0ySRxeRAPBV1XOK3EyUHtZn0BbMkn0hUdGu2u3cBP+3ogBkxXYN7pq7wKBgDVW
HUX6Lz65rMBuCOWUogomxFvO9xf82k61+EtHeOKBSBJ3wY+1m8tDIq3gtIJLL0Ts
GnUe7ZN+OvkFIT+J1KyGlED4TABUKIi/LsprHDSVVXm4FGQI5i6xexbZCgBkEr7c
NFdNXn4db9ZC+lp8mj+VVEzsx4/68MAwdTk/h+pBAoGAVLlcoDIe7S6yHX3nlCZW
ktl0TWWxcWLY4AUh0PtqPK+SxA3LQMl8nTf7NBfR4i5ux4mjkIgyhU0mQhsSY6BT
sOoChEvFl3Xv3sWORPECYJig1vLr5DXn1sKDESxhKqkQt85im5k/1tYE1kCge3st
CALSwHBX4TFyQgpKwPNzPrA=
-----END PRIVATE KEY-----`;

// ==================== AUTH ====================
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// ==================== YORDAMCHI FUNKSIYALAR ====================
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

// ==================== SWAGGER DOCS ====================
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'VSL Lead API',
    version: '1.0.0',
    description: 'VSL sayt uchun lead yig\'ish API',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
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
        summary: 'Yangi lead qo\'shish',
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
            description: 'Noto\'g\'ri ma\'lumot',
          },
          500: {
            description: 'Server xatoligi',
          },
        },
      },
    },
  },
};

// ==================== ROUTES ====================
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
        message: 'Telefon raqam noto\'g\'ri',
      });
    }

    const rows = await getAllRows();
    const dataRows = rows.slice(1);

    const duplicateRow = dataRows.find((row) => row[3] === normalizedPhone);

    if (duplicateRow) {
      return res.status(200).json({
        success: false,
        duplicate: true,
        message: 'Siz avval ro\'yxatdan o\'tgansiz',
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
      message: "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi",
    });
  } catch (error) {
    console.error('Lead saqlashda xatolik:', error?.response?.data || error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Serverda xatolik yuz berdi',
    });
  }
});

// ==================== SERVER START ====================
app.listen(3000, '0.0.0.0', () => {
  console.log(`Server running on port 3000`);
  console.log(`Swagger: http://localhost:3000/api-docs`);
});