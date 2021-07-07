import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import {
  Manifest,
  ValidationOptions,
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  fetchOrDeploy,
  getImplementationAddress,
  getStorageLayout,
  getStorageLayoutForAddress,
  getUnlinkedBytecode,
  getVersion,
} from '@openzeppelin/upgrades-core';

import { deploy } from './deploy';
import { readValidations } from './validations';

export async function deployImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  requiredOpts: Required<ValidationOptions>,
  proxyAddress?: string,
): Promise<string> {
  // const { provider } = hre.network;
  const provider = ImplFactory.signer.provider;
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(validations, ImplFactory.bytecode);
  const version = getVersion(unlinkedBytecode, ImplFactory.bytecode);
  const layout = getStorageLayout(validations, version);
  assertUpgradeSafe(validations, version, requiredOpts);

  if (proxyAddress !== undefined) {
    //@ts-ignore
    const manifest = await Manifest.forNetwork(provider);
    //@ts-ignore
    const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
    const currentLayout = await getStorageLayoutForAddress(manifest, validations, currentImplAddress);
    assertStorageUpgradeSafe(currentLayout, layout, requiredOpts);
  }
  //@ts-ignore
  return await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(ImplFactory);
    return { ...deployment, layout };
  });
}
