import { mount, flushPromises } from '@vue/test-utils';
import TodoList from '@/components/TodoList.vue';
import { generateClient } from 'aws-amplify/api';
import { addTodo } from '@/graphql/mutations';
import * as subscriptions from '@/graphql/subscriptions';

jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn().mockReturnValue({
    graphql: jest.fn(),
  }),
}));

jest.mock('@/graphql/queries', () => ({
  listTodos: jest.fn(),
}));

jest.mock('@/graphql/mutations', () => ({
  addTodo: jest.fn(),
  deleteTodo: jest.fn(),
  updateTodoStatus: jest.fn(),
}));

jest.mock('@/graphql/subscriptions', () => ({
  onTodoAdded: jest.fn(),
  onTodoDeleted: jest.fn(),
  onTodoUpdated: jest.fn(),
}));

describe('TodoList.vue', () => {
  let client;

  beforeEach(() => {
    client = generateClient();

    client.graphql.mockImplementation(({ query }) => {
      if (query === subscriptions.onTodoAdded || query === subscriptions.onTodoDeleted || query === subscriptions.onTodoUpdated) {
        return {
          subscribe: jest.fn().mockImplementation(() => ({
            unsubscribe: jest.fn(),
          })),
        };
      }

      return Promise.resolve({
        data: {},
      });
    });
  });

  it('should render the todo list on mount', async () => {
    const todosMock = {
      data: {
        listTodos: [
          { id: 1, name: 'Test Todo 1', description: 'Description 1', completed: false },
          { id: 2, name: 'Test Todo 2', description: 'Description 2', completed: true },
        ],
      },
    };
    client.graphql.mockResolvedValueOnce(todosMock);

    const wrapper = mount(TodoList);

    await flushPromises();

    expect(wrapper.findAll('.card')).toHaveLength(2);
    expect(wrapper.text()).toContain('Test Todo 1');
    expect(wrapper.text()).toContain('Description 1');
    expect(wrapper.text()).toContain('Test Todo 2');
    expect(wrapper.text()).toContain('Description 2');
  });

  it('should handle API errors gracefully', async () => {
    client.graphql.mockRejectedValueOnce(new Error('API Error'));

    const wrapper = mount(TodoList);

    await flushPromises();

    expect(wrapper.text()).not.toContain('Test Todo 1');
  });

  it('should prevent adding an empty todo', async () => {
    const wrapper = mount(TodoList);

    await wrapper.find('button').trigger('click');

    expect(client.graphql).not.toHaveBeenCalledWith({ query: addTodo });
    expect(wrapper.find('.form-control').classes()).not.toContain('is-invalid');
  });

  it('should add a new todo via subscription', async () => {
    const newTodoFromSubscription = {
      data: {
        onTodoAdded: { id: 3, name: 'New Todo', description: 'New Description', completed: false },
      },
    };
  
    const todosMock = {
      data: {
        listTodos: [
          { id: 1, name: 'Existing Todo', description: 'Existing Description', completed: false },
        ],
      },
    };
  
    const subscribeMock = jest.fn();
    client.graphql
      .mockResolvedValueOnce(todosMock)
      .mockImplementation(({ query }) => {
        if (query === subscriptions.onTodoAdded || query === subscriptions.onTodoDeleted || query === subscriptions.onTodoUpdated) {
          return {
            subscribe: subscribeMock.mockImplementation(() => {
              // Simulate real-time update
              if (query === subscriptions.onTodoAdded) {
                return {
                  unsubscribe: jest.fn(),
                };
              }
              return { unsubscribe: jest.fn() };
            }),
          };
        }
        return Promise.resolve();
      });
  
    const wrapper = mount(TodoList);
  
    // Wait for the initial API call and subscription setup to complete
    await flushPromises();

    // Now manually trigger the subscription to simulate real-time addition of a todo
    subscribeMock.mock.calls[0][0].next(newTodoFromSubscription);
  
    // Wait for any updates that occur after subscription
    await flushPromises();
  
    expect(wrapper.findAll('.card')).toHaveLength(2); // 1 existing + 1 added from subscription
    expect(wrapper.text()).toContain('New Todo');
    expect(wrapper.text()).toContain('New Description');
  });

  it('should remove a todo via subscription', async () => {
    const todoDeletedFromSubscription = {
      data: {
        onTodoDeleted: { id: 1 },
      },
    };
  
    const todosMock = {
      data: {
        listTodos: [
          { id: 1, name: 'First Todo', description: 'First Description', completed: false },
          { id: 2, name: 'Second Todo', description: 'Second Description', completed: false },
        ],
      },
    };
  
    const subscribeMock = jest.fn();
    client.graphql
      .mockResolvedValueOnce(todosMock)
      .mockImplementation(({ query }) => {
        if (query === subscriptions.onTodoAdded || query === subscriptions.onTodoDeleted || query === subscriptions.onTodoUpdated) {
          return {
            subscribe: subscribeMock.mockImplementation(() => {
              if (query === subscriptions.onTodoDeleted) {
                return { unsubscribe: jest.fn() };
              }
              return { unsubscribe: jest.fn() };
            }),
          };
        }
        return Promise.resolve();
      });
  
    const wrapper = mount(TodoList);
  
    // Wait for the initial API call and subscription setup to complete
    await flushPromises();
  
    // Manually trigger the subscription for the deletion
    subscribeMock.mock.calls[1][0].next(todoDeletedFromSubscription);
  
    // Wait for any updates that occur after the subscription event
    await flushPromises();
  
    expect(wrapper.findAll('.card')).toHaveLength(1); // 1 todo should remain after deletion
    expect(wrapper.text()).not.toContain('Existing Todo');
  });

  it('should update a todo via subscription', async () => {
    const todoUpdatedFromSubscription = {
      data: {
        onTodoUpdated: { id: 1, name: 'Updating Todo', description: 'Updating Description', completed: true },
      },
    };
  
    const todosMock = {
      data: {
        listTodos: [
          { id: 1, name: 'Updating Todo', description: 'Updating Description', completed: false },
          { id: 2, name: 'Another Todo', description: 'Another Description', completed: false },
        ],
      },
    };
  
    const subscribeMock = jest.fn();
    client.graphql
      .mockResolvedValueOnce(todosMock)
      .mockImplementation(({ query }) => {
        if (query === subscriptions.onTodoAdded || query === subscriptions.onTodoDeleted || query === subscriptions.onTodoUpdated) {
          return {
            subscribe: subscribeMock.mockImplementation(() => {
              if (query === subscriptions.onTodoUpdated) {
                return { unsubscribe: jest.fn() };
              }
              return { unsubscribe: jest.fn() };
            }),
          };
        }
        return Promise.resolve();
      });
  
    const wrapper = mount(TodoList);
  
    // Wait for the initial API call and subscription setup to complete
    await flushPromises();
  
    // Manually trigger the subscription for the update
    subscribeMock.mock.calls[2][0].next(todoUpdatedFromSubscription);
  
    // Wait for any updates that occur after the subscription event
    await flushPromises();
  
    // Check if the todo's status has been updated via subscription
    const todoCard = wrapper.findAll('.card .flex-grow-1').at(0);
    expect(todoCard.text()).toContain('Updating Todo');
    expect(todoCard.classes()).toContain('text-decoration-line-through');
  });
});
