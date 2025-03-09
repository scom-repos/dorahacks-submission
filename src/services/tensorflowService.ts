import * as tf from '@tensorflow/tfjs-node';

export const setupTensorflowBackend = async () => {
    // Ensure the backend is set to tensorflow
    await tf.setBackend('tensorflow');
    await tf.ready();
};