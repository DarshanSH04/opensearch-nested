import {Client} from '@opensearch-project/opensearch'

const client = new Client({ node: 'https://localhost:9200', ssl: { rejectUnauthorized: false}})

export default client