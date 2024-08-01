/* eslint-disable no-debugger */
import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";


import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'

import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";

import { BedrockRuntimeClient, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";

const client = generateClient<Schema>();

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

  useEffect(() => {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
  }, []);

  function createTodo() {
    client.models.Todo.create({ content: window.prompt("Todo content") });
  }

  async function callBedrock() {
    const cognitoIdentityClient = new CognitoIdentityClient({ region: 'eu-west-1' });

    // Get the ID token from local storage
    const idToken = localStorage.getItem('CognitoIdentityServiceProvider.5j8va6d17qbgtva9jdbbktjtcq.2215e464-b031-703a-e1d1-3ce9f9520383.idToken');
    console.log(`idToken: ${idToken}`);
    const decodedToken = JSON.parse(atob(idToken!.split('.')[1]));
    const issuer = decodedToken.iss;
    console.log(`issuer: ${issuer}`);
    debugger;
    // Ensure the correct format for the provider name
    const providerName = issuer.replace("https://", "");

    // Configure credentials using the ID token
    const credentials = fromCognitoIdentityPool({
      client: cognitoIdentityClient,
      identityPoolId: "eu-west-1:ebbbbd61-1420-405a-a28a-804307679e3b",
      logins: {
        [providerName]: idToken,
      },
    });

    // Initialize Bedrock Client with the credentials
    const bedrockClient = new BedrockRuntimeClient({
      credentials,
      region: 'eu-west-1',
    });

    const command = new ConverseStreamCommand({
      modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
      messages: [
        {
          role: "user",
          content: [{ text: "Hello, how are you doing?" }],
        }
      ],
      inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
    });

    try {
      // Send the command to the model and wait for the response
      const response = await bedrockClient.send(command);

      if (!response.stream) {
        console.log("Stream response received");
        return;
      }
      // Extract and print the streamed response text in real-time.
      for await (const item of response.stream) {
        if (item.contentBlockDelta) {
          console.log(item.contentBlockDelta.delta?.text);
        }
      }
    } catch (err) {
      console.log(`ERROR: ${err}`);
    }
  }
  return (
    <Authenticator>
      {({ signOut }) => (
        <main>
          <button onClick={signOut}>Sign out</button>
          <button onClick={callBedrock}>Call Bedrock</button>
          <h1>My todos</h1>
          <button onClick={createTodo}>+ new</button>
          <ul>
            {todos.map((todo) => (
              <li key={todo.id}>{todo.content}</li>
            ))}
          </ul>
          <div>
            🥳 App successfully hosted. Try creating a new todo.
            <br />
            <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
              Review next step of this tutorial.
            </a>
          </div>
        </main>

      )}
    </Authenticator>
  );
}

export default App;
