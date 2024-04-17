import { Box, Button, Select, Text, VStack } from "@chakra-ui/react";

// Define the props type for the component
// interface LiquidityPoolCreationProps {
//   onRevokeAuthority: () => void; // You can define the correct type depending on your state management
//   tokenOptions: string[]; // Replace with the actual type if you have a more complex structure
//   selectedToken: string; // Replace with the correct type
//   onSelectToken: (token: string) => void; // You can define the correct type depending on your state management
// }

export const RevokeAuthority = ({
  title,
  subTitle,
  button,
  onSelectToken,
  onRevokeAuthority,
  selectedToken,
  tokenList,
}) => {
  return (
    <VStack
      spacing={4}
      p={5}
      backgroundColor="purple.800"
      borderRadius="lg"
      boxShadow="md"
      marginBottom="10px"
      width="100%"
    >
      <Text fontSize="xl" color="white">
        {title}
      </Text>
      <Text fontSize="md" color="purple.200">
        {subTitle}
      </Text>
      <Box width="full">
        <Select
          placeholder="Select Token"
          value={selectedToken}
          onChange={(e) => onSelectToken(e.target.value)}
          variant="filled"
          color="purple.700"
        >
          {tokenList.map((token, key) => (
            <option value={token} key={key}>
              {token}
            </option>
          ))}
        </Select>
      </Box>
      <Button colorScheme="blue" variant="solid" onClick={onRevokeAuthority}>
        {button}
      </Button>
    </VStack>
  );
};
