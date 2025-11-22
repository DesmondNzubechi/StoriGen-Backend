import swaggerJsdoc from 'swagger-jsdoc';
import { Options } from 'swagger-jsdoc';
import { config } from 'dotenv';

config({ path: './config.env' });

// Parse ORIGIN_URL to get all allowed origins for Swagger servers
const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:3000';
const servers = ORIGIN_URL.split(',')
  .map((url) => url.trim())
  .filter((url) => url.length > 0)
  .map((url, index) => ({
    url,
    description: index === 0 ? 'Primary server' : `Server ${index + 1}`
  }));

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StoriGen Backend API',
      version: '1.0.0',
      description: 'AI-powered YouTube storytelling tool API',
      contact: {
        name: 'StoriGen Team',
        email: 'support@storigen.com'
      }
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'jwt'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['fullName', 'email', 'password'],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated ID of the user'
            },
            fullName: {
              type: 'string',
              description: 'Full name of the user'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User\'s email address'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'super-admin'],
              description: 'Role of the user'
            },
            emailVerified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            profileImage: {
              type: 'string',
              description: 'URL to user\'s profile image'
            },
            googleId: {
              type: 'string',
              description: 'Google OAuth ID if linked'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp'
            }
          }
        },
        Story: {
          type: 'object',
          required: ['prompt', 'targetWords', 'targetChapters'],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated ID of the story'
            },
            user: {
              type: 'string',
              description: 'ID of the user who created the story'
            },
            prompt: {
              type: 'string',
              description: 'Original story prompt'
            },
            targetWords: {
              type: 'number',
              description: 'Target word count for the story'
            },
            targetChapters: {
              type: 'number',
              description: 'Number of chapters to generate'
            },
            outline: {
              type: 'string',
              description: 'AI-generated story outline'
            },
            characterProfile: {
              type: 'string',
              description: 'Character profile information'
            },
            chapters: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Chapter'
              }
            },
            youtubeAssets: {
              $ref: '#/components/schemas/YouTubeAssets'
            },
            status: {
              type: 'string',
              enum: ['in_progress', 'chapters_complete', 'assets_complete'],
              description: 'Current status of the story'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Story creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Story last update timestamp'
            }
          }
        },
        Chapter: {
          type: 'object',
          required: ['number', 'text'],
          properties: {
            number: {
              type: 'number',
              description: 'Chapter number'
            },
            title: {
              type: 'string',
              description: 'Chapter title'
            },
            text: {
              type: 'string',
              description: 'Full chapter text'
            },
            paragraphs: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Paragraph'
              }
            }
          }
        },
        Paragraph: {
          type: 'object',
          required: ['text'],
          properties: {
            text: {
              type: 'string',
              description: 'Paragraph text content'
            },
            imagePrompt: {
              type: 'string',
              description: 'AI-generated image prompt for this paragraph'
            }
          }
        },
        YouTubeAssets: {
          type: 'object',
          properties: {
            synopsis: {
              type: 'string',
              description: '2-3 sentence story synopsis'
            },
            titles: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'SEO-optimized YouTube title options'
            },
            description: {
              type: 'string',
              description: 'YouTube video description'
            },
            thumbnailPrompt: {
              type: 'string',
              description: 'AI-generated thumbnail prompt'
            },
            hashtags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'YouTube hashtags'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success'
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      },
      {
        cookieAuth: []
      }
    ]
  },
  apis: ['./src/Routes/*.ts', './src/Controllers/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
