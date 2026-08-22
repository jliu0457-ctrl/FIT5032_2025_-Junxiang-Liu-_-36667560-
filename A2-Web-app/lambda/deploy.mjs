// deploy.mjs — one-shot deployment of the IHC Lambda function (BR E.1)
//
// Prerequisites:
//   - AWS CLI installed and logged in (`aws sts get-caller-identity` works)
//   - The Firebase service-account JSON is in this folder (lambda/*firebase-adminsdk*.json)
//   - Run `npm install` in this folder once before deploying
//
// Usage:  node deploy.mjs
// After it finishes, copy the printed Function URL into .env as VITE_LAMBDA_URL.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FUNCTION_NAME = 'Assignment3'
const ROLE_NAME = 'ihc-lambda-role'
const RUNTIME = 'nodejs24.x'

function aws(args) {
  console.log('> aws ' + args.join(' '))
  return execFileSync('aws', args, { cwd: HERE, encoding: 'utf8' })
}

function awsJson(args) {
  return JSON.parse(aws([...args, '--output', 'json']))
}

function ignoredAlreadyExists(fn, label) {
  try {
    fn()
  } catch (e) {
    if (/already exists|ResourceConflict|FunctionUrlConfigExists/i.test(e.stderr || e.message || '')) {
      console.log(`${label} already exists — skipping`)
    } else {
      throw e
    }
  }
}

// ---- 1. Locate the Firebase service-account key ----
const keyFile = fs.readdirSync(HERE).find(f => f.includes('firebase-adminsdk') && f.endsWith('.json'))
if (!keyFile) {
  console.error('ERROR: no service-account JSON (name contains "firebase-adminsdk") found in ' + HERE)
  process.exit(1)
}
console.log('Service-account key file: ' + keyFile)
const serviceAccount = fs.readFileSync(path.join(HERE, keyFile), 'utf8')

// ---- 2. IAM role ----
ignoredAlreadyExists(() => {
  awsJson([
    'iam', 'create-role', '--role-name', ROLE_NAME,
    '--assume-role-policy-document', 'file://trust-policy.json',
    '--query', 'Role.Arn'
  ])
  aws(['iam', 'attach-role-policy', '--role-name', ROLE_NAME,
    '--policy-arn', 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'])
  console.log('IAM role created')
}, 'IAM role')

const roleArn = aws(['iam', 'get-role', '--role-name', ROLE_NAME, '--query', 'Role.Arn', '--output', 'text']).trim()
console.log('Role ARN: ' + roleArn)

// ---- 3. Zip the function code (service-account key is NOT included) ----
const zipPath = path.join(HERE, 'function.zip')
if (fs.existsSync(zipPath)) fs.rmSync(zipPath)
execFileSync('powershell', [
  '-Command',
  `Compress-Archive -Path 'index.mjs','node_modules' -DestinationPath 'function.zip' -Force`
], { cwd: HERE, stdio: 'inherit' })
console.log('Code zipped (' + Math.round(fs.statSync(zipPath).size / 1024) + ' KB)')

// ---- 4. Create the function (skip if it exists), then always deploy the latest code ----
let created = false
ignoredAlreadyExists(() => {
  awsJson([
    'lambda', 'create-function', '--function-name', FUNCTION_NAME,
    '--runtime', RUNTIME, '--role', roleArn, '--handler', 'index.handler',
    '--timeout', '30', '--memory-size', '256',
    '--zip-file', 'fileb://function.zip'
  ])
  created = true
  console.log('Lambda function created')
}, 'Lambda function')
if (!created) {
  aws(['lambda', 'update-function-code', '--function-name', FUNCTION_NAME, '--zip-file', 'fileb://function.zip'])
  console.log('Lambda code updated')
}

// ---- 5. Environment variables (from the local key file) ----
const envPath = path.join(HERE, 'env-vars.tmp.json')
fs.writeFileSync(envPath, JSON.stringify({
  Variables: {
    FIREBASE_SERVICE_ACCOUNT: serviceAccount,
    ALLOWED_ORIGIN: '*',
    RESEND_API_KEY: process.env.RESEND_API_KEY || ''
  }
}))
aws(['lambda', 'update-function-configuration', '--function-name', FUNCTION_NAME, '--environment', 'file://' + envPath])
fs.rmSync(envPath)
console.log('Environment variables configured')

// ---- 6. Function URL (auth NONE — the function verifies Firebase ID tokens itself) ----
ignoredAlreadyExists(() => {
  awsJson([
    'lambda', 'create-function-url-config', '--function-name', FUNCTION_NAME,
    '--auth-type', 'NONE',
    '--cors', '{"AllowOrigins":["*"],"AllowMethods":["*"],"AllowHeaders":["*"]}'
  ])
  console.log('Function URL created')
}, 'Function URL')
ignoredAlreadyExists(() => {
  aws(['lambda', 'add-permission', '--function-name', FUNCTION_NAME,
    '--statement-id', 'FunctionUrlAllow', '--action', 'lambda:InvokeFunctionUrl',
    '--principal', '*', '--function-url-auth-type', 'NONE'])
}, 'URL permission')

// ---- 7. Done ----
const cfg = awsJson(['lambda', 'get-function-url-config', '--function-name', FUNCTION_NAME])
console.log('')
console.log('==============================================')
console.log('  Function URL: ' + cfg.FunctionUrl)
console.log('==============================================')
console.log('')
console.log('Next steps:')
console.log('  1. Put this URL into .env:  VITE_LAMBDA_URL=' + cfg.FunctionUrl)
console.log('  2. Restart `npm run dev`')
console.log('  3. Book an appointment on the calendar — the Lambda validates and stores it')