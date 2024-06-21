import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import client from './opensearchClient'
import faker from 'faker'
import { Entity, entityMapping } from './types'

const app = express()
app.use(bodyParser.json())

const INDEX_NAME = 'entity'
const BATCH_SIZE = 2000; // Number of documents to insert per batch
const TOTAL_DOCUMENTS = 10000000; // Total number of documents to generate

// Endpoint to create index and mappings
app.post('/index', async (req: Request, res: Response) => {
  try {
    const response = await client.indices.create({ index: INDEX_NAME, body: entityMapping }, { ignore: [400] })
    res.json(response.body)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating index and mappings' });
  }
});

// Endpoint to delete index
app.delete('/index', async (req: Request, res: Response) => {
  try {
    const response = await client.indices.delete({ index: INDEX_NAME });
    res.json(response.body)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error })
  }
});

// // Create entity
// app.post('/entities', async (req: Request, res: Response) => {
//   try{
//     const entity: Entity = req.body
//     const response = await client.index({
//       index: INDEX_NAME,
//       body: entity,
//     })
//     res.json(response)
//   }
//   catch (e){
//     res.status(500).json({ error: e})
//   }
// })

// Read entity
app.get('/entities/:id', async (req: Request, res: Response) => {
  try{
    const {id} = req.params
    const response = await client.get({
      index: INDEX_NAME,
      id,
    })
    res.json(response)
  }
  catch (e){
    res.status(500).json({ error: e})
  }
})

app.get('/entities', async (req: Request, res: Response) => {
  try {
    const response = await client.search({
      index: INDEX_NAME,
      size: 10, // Limit to 10 entities
    });

    const entities = response.body.hits.hits.map((hit: any) => hit._source); // Extract source data

    res.json(entities);
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error });
  }
});

// Update entity
app.put('/entities/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const entity: Partial<Entity> = req.body
  const response = await client.update({
    index: INDEX_NAME,
    id,
    body: {
      doc: entity,
    },
  })
  res.json(response)
})

// Delete entity
app.delete('/entities/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const response = await client.delete({
    index: INDEX_NAME,
    id,
  })
  res.json(response)
})

// Search entities
app.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    console.log(await client.count({ index: INDEX_NAME }))
    const searchParams = {
      index: 'entity', // Replace with your index name
      body: {
        query: {
          bool: {
            should: [
              { multi_match: { query: q, fields: ['name', 'description', 'tags'] }},
              { nested: { path: 'events', query: { multi_match: { query: q, fields: ['events.name', 'events.description'] }}}},
              { nested: { path: 'job_posts', query: { multi_match: { query: q, fields: ['job_posts.title', 'job_posts.description', 'job_posts.tags'] }}}}
            ]
          }
        },
        size: 1000
      }
    };

    const response = await client.search(searchParams);
    const hits = response.body.hits.hits.map((hit: any) => hit._source); // Extract source data

    res.json(hits);
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ error });
  }
})

// Function to generate a single entity document with nested events and job_posts
function generateEntity(): Entity {
  let entity_id = faker.datatype.uuid()
  return {
    entity_id,
    name: faker.company.companyName(),
    description: faker.lorem.paragraph(),
    tags: [faker.random.word(), faker.random.word(), faker.random.word()],
    events: Array.from({ length: faker.datatype.number({ min: 1, max: 3 }) }, () => ({
      event_id: faker.datatype.uuid(),
      name: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      timestamp: faker.date.recent().toISOString()
    })),
    job_posts: Array.from({ length: faker.datatype.number({ min: 1, max: 3 }) }, () => ({
      id: faker.datatype.uuid(),
      entity_id,
      title: faker.name.jobTitle(),
      description: faker.lorem.paragraph(),
      salary: faker.datatype.number({ min: 30000, max: 150000 }),
      tags: [faker.random.word(), faker.random.word(), faker.random.word()]
    }))
  };
}

// Function to insert a batch of documents into OpenSearch
async function insertBatch(batch: Entity[]) {
  const body = batch.flatMap(doc => [{ index: { _index: 'entity' } }, doc]);
  await client.bulk({ refresh: true, body });
}


// Generate fake data
app.post('/generate-fake-data', async (req: Request, res: Response) => {
  try {
    let batch: Entity[] = [];
    for (let i = 1; i <= TOTAL_DOCUMENTS; i++) {
      batch.push(generateEntity());

      if (batch.length === BATCH_SIZE) {
        await insertBatch(batch);
        batch = []; // Clear the batch
      }
    }

    // Insert any remaining documents in the final batch
    if (batch.length > 0) {
      await insertBatch(batch);
    }
    console.log(await client.count({ index: INDEX_NAME }))
    res.json({ message: `Successfully inserted ${TOTAL_DOCUMENTS} documents` });
  } catch (error) {
    console.error('Error generating and inserting data:', error);
    res.status(500).json({ error });
  }
})

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})
