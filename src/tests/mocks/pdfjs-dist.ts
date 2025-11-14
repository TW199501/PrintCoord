export const GlobalWorkerOptions = {
  workerSrc: "",
};

export const getDocument = () => ({
  promise: Promise.resolve({
    numPages: 0,
    getPage: async () => ({
      getViewport: () => ({ width: 0, height: 0 }),
      render: () => ({ promise: Promise.resolve() }),
    }),
  }),
});

export default {
  GlobalWorkerOptions,
  getDocument,
};
