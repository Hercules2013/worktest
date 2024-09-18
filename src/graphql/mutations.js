/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const addTodo = /* GraphQL */ `
  mutation AddTodo($name: String!, $description: String!) {
    addTodo(name: $name, description: $description) {
      id
      name
      description
      completed
      __typename
    }
  }
`;
export const updateTodoStatus = /* GraphQL */ `
  mutation UpdateTodoStatus($id: ID!, $completed: Boolean!) {
    updateTodoStatus(id: $id, completed: $completed) {
      id
      name
      description
      completed
      __typename
    }
  }
`;
export const deleteTodo = /* GraphQL */ `
  mutation DeleteTodo($id: ID!) {
    deleteTodo(id: $id) {
      id
      name
      description
      completed
      __typename
    }
  }
`;
