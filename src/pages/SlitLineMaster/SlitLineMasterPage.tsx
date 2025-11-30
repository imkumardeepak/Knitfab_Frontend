import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SlitLineMasterList from '@/components/SlitLineMaster/SlitLineMasterList';

const SlitLineMasterPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Slit Line Master Management</CardTitle>
        </CardHeader>
        <CardContent>
          <SlitLineMasterList />
        </CardContent>
      </Card>
    </div>
  );
};

export default SlitLineMasterPage;